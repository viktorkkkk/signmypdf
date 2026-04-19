import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/db';
import { signJWT } from '../../../lib/jwt';
import { sendMagicLinkEmail } from '../../../lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    const sql = getDb();
    const rows = await sql`
      SELECT status, plan, valid_until FROM subscriptions
      WHERE email = ${email} AND status = 'active'
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No active subscription found for this email' }, { status: 404 });
    }

    const token = await signJWT({ email }, 60 * 60 * 24 * 30); // 30 days
    const magicUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://signmypdf.io'}/dashboard?token=${token}`;

    await sendMagicLinkEmail(email, magicUrl);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Magic link error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
