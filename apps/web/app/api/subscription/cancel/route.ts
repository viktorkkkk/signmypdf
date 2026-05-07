import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/db';
import { verifyJWT } from '../../../lib/jwt';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = await verifyJWT(token);
  if (!payload || typeof payload.email !== 'string') {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  try {
    const sql = getDb();
    const rows = await sql`
      SELECT paddle_subscription_id FROM subscriptions
      WHERE email = ${payload.email} AND status = 'active'
      LIMIT 1
    `;

    if (rows.length === 0 || !rows[0].paddle_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    const subId = rows[0].paddle_subscription_id;

    // Cancel via Paddle API
    const res = await fetch(`https://api.paddle.com/subscriptions/${subId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PADDLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ effective_from: 'next_billing_period' }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Paddle cancel error:', data);
      return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 });
    }

    // Update DB
    await sql`
      UPDATE subscriptions SET status = 'cancelled', updated_at = NOW()
      WHERE email = ${payload.email}
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Cancel error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
