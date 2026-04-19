import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/db';
import { signJWT } from '../../../lib/jwt';

// Called client-side after checkout to get a session token without email
// Only works if subscription exists in DB
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    const sql = getDb();
    const rows = await sql`
      SELECT status FROM subscriptions
      WHERE email = ${email} AND status = 'active'
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 404 });
    }

    const token = await signJWT({ email }, 60 * 60 * 24 * 30); // 30 days
    return NextResponse.json({ token });
  } catch (err) {
    console.error('Auto-token error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
