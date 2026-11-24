import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'student-1';

    const users = db.prepare('SELECT * FROM users ORDER BY role DESC, personal_id ASC').all();
    const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    return NextResponse.json({
      currentUser,
      users
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
