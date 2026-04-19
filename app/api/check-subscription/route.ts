import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../lib/db';

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');
  if (!email) return NextResponse.json({ active: false });

  try {
    const sql = getDb();
    const rows = await sql`
      SELECT status, plan, valid_until FROM subscriptions
      WHERE email = ${email} AND status = 'active'
      LIMIT 1
    `;

    if (rows.length === 0) return NextResponse.json({ active: false });
    return NextResponse.json({ active: true, plan: rows[0].plan, valid_until: rows[0].valid_until });
  } catch (err) {
    console.error('Check subscription error:', err);
    return NextResponse.json({ active: false });
  }
}
