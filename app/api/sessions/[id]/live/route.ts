import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const telemetry = db.prepare(`
      SELECT 
        lt.*,
        u.name as student_name,
        u.personal_id as student_personal_id,
        u.batch as student_batch,
        sub.status as submission_status,
        sub.marks_obtained,
        sub.id as submission_id
      FROM live_telemetry lt
      JOIN users u ON lt.student_id = u.id
      LEFT JOIN submissions sub ON sub.student_id = lt.student_id AND sub.practical_id = lt.practical_id
      WHERE lt.session_id = ?
      ORDER BY lt.last_heartbeat DESC
    `).all(id);

    const session = db.prepare(`
      SELECT ls.*, s.title as subject_title, s.code as subject_code, p.title as practical_title
      FROM live_sessions ls
      JOIN subjects s ON ls.subject_id = s.id
      LEFT JOIN practicals p ON ls.active_practical_id = p.id
      WHERE ls.id = ?
    `).get(id);

    return NextResponse.json({
      session,
      telemetry
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const body = await req.json();
    const { studentId, practicalId, currentLanguage, keystrokes, statusLabel } = body;

    const nowIso = new Date().toISOString();

    db.prepare(`
      INSERT INTO live_telemetry (
        student_id, session_id, practical_id, current_language,
        keystrokes_count, run_count, tests_passed, tests_total,
        status_label, last_heartbeat
      ) VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?, ?)
      ON CONFLICT(student_id) DO UPDATE SET
        session_id = excluded.session_id,
        practical_id = excluded.practical_id,
        current_language = excluded.current_language,
        keystrokes_count = keystrokes_count + ?,
        status_label = COALESCE(excluded.status_label, live_telemetry.status_label),
        last_heartbeat = excluded.last_heartbeat
    `).run(
      studentId,
      id,
      practicalId || '',
      currentLanguage || 'cpp',
      keystrokes || 15,
      statusLabel || 'Coding Live in Lab 💻',
      nowIso,
      keystrokes || 15
    );

    return NextResponse.json({ success: true, timestamp: nowIso });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
