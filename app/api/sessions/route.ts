import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const sessions = db.prepare(`
      SELECT 
        ls.*,
        s.code as subject_code,
        s.title as subject_title,
        p.title as practical_title,
        p.exp_number as practical_exp_number,
        u.name as teacher_name,
        (SELECT COUNT(*) FROM live_telemetry WHERE session_id = ls.id) as students_connected
      FROM live_sessions ls
      JOIN subjects s ON ls.subject_id = s.id
      LEFT JOIN practicals p ON ls.active_practical_id = p.id
      JOIN users u ON ls.teacher_id = u.id
      ORDER BY ls.status ASC, ls.created_at DESC
    `).all();

    return NextResponse.json({ sessions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const db = getDb();
    const body = await req.json();
    const {
      subject_id,
      teacher_id,
      lab_room,
      batch,
      active_practical_id,
      duration_minutes
    } = body;

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const session_code = `LAB-${randomSuffix}`;
    const now = new Date();
    const duration = duration_minutes ? Number(duration_minutes) : 120;
    const end_time = new Date(now.getTime() + duration * 60 * 1000).toISOString();
    const id = `sess-${Date.now()}`;

    db.prepare(`
      INSERT INTO live_sessions (
        id, session_code, subject_id, teacher_id, lab_room,
        batch, active_practical_id, start_time, end_time, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `).run(
      id,
      session_code,
      subject_id || 'sub-1',
      teacher_id || 'teacher-1',
      lab_room || 'Main Computer Centre (Lab 304)',
      batch || 'Batch A',
      active_practical_id || null,
      now.toISOString(),
      end_time,
      now.toISOString()
    );

    return NextResponse.json({
      success: true,
      sessionId: id,
      session_code,
      start_time: now.toISOString(),
      end_time
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const db = getDb();
    const body = await req.json();
    const { sessionId, action } = body;

    if (action === 'end') {
      db.prepare(`
        UPDATE live_sessions
        SET status = 'ended'
        WHERE id = ?
      `).run(sessionId);

      return NextResponse.json({ success: true, message: 'Session concluded' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
