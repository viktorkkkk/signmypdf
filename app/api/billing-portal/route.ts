import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../lib/db';
import { verifyJWT } from '../../lib/jwt';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = await verifyJWT(token);
  if (!payload || typeof payload.email !== 'string') {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  try {
    const sql = getDb();
    const rows = await sql`
      SELECT paddle_customer_id FROM subscriptions
      WHERE email = ${payload.email} AND status = 'active'
      LIMIT 1
    `;

    if (rows.length === 0 || !rows[0].paddle_customer_id) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
    }

    const customerId = rows[0].paddle_customer_id;

    // Generate Paddle customer portal session
    const res = await fetch(`https://api.paddle.com/customers/${customerId}/portal-sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PADDLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const data = await res.json();

    if (!res.ok || !data.data?.urls?.general?.overview) {
      console.error('Paddle portal error:', data);
      return NextResponse.json({ error: 'Could not generate portal link' }, { status: 500 });
    }

    return NextResponse.json({ url: data.data.urls.general.overview });
  } catch (err) {
    console.error('Billing portal error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
