import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../lib/db';
import { sendProActivationEmail } from '../../lib/email';

async function verifyPaddleSignature(req: NextRequest, body: string): Promise<boolean> {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) return true; // skip in dev if not set

  const signatureHeader = req.headers.get('paddle-signature');
  if (!signatureHeader) return false;

  // Format: ts=<timestamp>;h1=<hash>
  const parts = Object.fromEntries(
    signatureHeader.split(';').map(p => p.split('=') as [string, string])
  );
  const { ts, h1 } = parts;
  if (!ts || !h1) return false;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(`${ts}:${body}`);

  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const expectedHash = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return expectedHash === h1;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();

    const valid = await verifyPaddleSignature(req, body);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);
    const sql = getDb();
    const eventType = event.event_type;
    const data = event.data;

    if (eventType === 'subscription.created' || eventType === 'subscription.updated' || eventType === 'subscription.activated') {
      const email = data.customer?.email || data.custom_data?.email;
      if (!email) return NextResponse.json({ ok: true });

      const priceId = data.items?.[0]?.price?.id || '';
      const plan = priceId.includes('annual') || priceId === 'pri_01kpea99a37j2ecg9vxq8xr9zt' ? 'annual' : 'monthly';
      const status = data.status === 'active' ? 'active' : data.status;
      const validUntil = data.current_billing_period?.ends_at || null;

      await sql`
        INSERT INTO subscriptions (email, paddle_subscription_id, paddle_customer_id, plan, status, valid_until, updated_at)
        VALUES (${email}, ${data.id}, ${data.customer_id}, ${plan}, ${status}, ${validUntil}, NOW())
        ON CONFLICT (email) DO UPDATE SET
          paddle_subscription_id = EXCLUDED.paddle_subscription_id,
          paddle_customer_id = EXCLUDED.paddle_customer_id,
          plan = EXCLUDED.plan,
          status = EXCLUDED.status,
          valid_until = EXCLUDED.valid_until,
          updated_at = NOW()
      `;

      try {
        await sendProActivationEmail(email, data.customer?.name, plan);
      } catch (e) {
        console.error('Email send failed:', e);
        // don't fail the webhook
      }
    }

    if (eventType === 'subscription.cancelled') {
      const email = data.customer?.email || data.custom_data?.email;
      if (email) {
        await sql`
          UPDATE subscriptions SET status = 'cancelled', updated_at = NOW()
          WHERE email = ${email}
        `;
      }
    }

    if (eventType === 'transaction.completed') {
      const email = data.customer?.email || data.custom_data?.email;
      if (!email) return NextResponse.json({ ok: true });

      const priceId = data.items?.[0]?.price?.id || '';
      const plan = priceId === 'pri_01kpea99a37j2ecg9vxq8xr9zt' ? 'annual' : 'monthly';

      await sql`
        INSERT INTO subscriptions (email, paddle_customer_id, plan, status, updated_at)
        VALUES (${email}, ${data.customer_id}, ${plan}, 'active', NOW())
        ON CONFLICT (email) DO UPDATE SET
          status = 'active',
          plan = EXCLUDED.plan,
          updated_at = NOW()
      `;

      try {
        await sendProActivationEmail(email, data.customer?.name, plan);
      } catch (e) {
        console.error('Email send failed:', e);
        // don't fail the webhook
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
