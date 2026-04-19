import { NextResponse } from 'next/server';
import { initDb } from '../../lib/db';

export async function GET() {
  try {
    await initDb();
    return NextResponse.json({ ok: true, message: 'Database initialized' });
  } catch (err) {
    console.error('Init DB error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
