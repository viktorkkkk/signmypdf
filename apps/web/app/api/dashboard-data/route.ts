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
      SELECT email, plan, status, valid_until, paddle_subscription_id, created_at
      FROM subscriptions
      WHERE email = ${payload.email}
      LIMIT 1
    `;

    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ ...rows[0], email: payload.email });
  } catch (err) {
    console.error('Dashboard data error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
