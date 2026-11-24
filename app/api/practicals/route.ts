import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId') || 'student-1';

    const practicals = db.prepare(`
      SELECT 
        p.*,
        s.code as subject_code,
        s.title as subject_title,
        s.department as subject_department,
        sub.id as submission_id,
        sub.status as submission_status,
        sub.marks_obtained,
        sub.max_marks as submission_max_marks,
        sub.teacher_remarks,
        sub.teacher_signature,
        sub.verified_at,
        sub.simultaneous_proof,
        sub.language as submitted_language,
        sub.updated_at as submitted_updated_at
      FROM practicals p
      JOIN subjects s ON p.subject_id = s.id
      LEFT JOIN submissions sub ON sub.practical_id = p.id AND sub.student_id = ?
      ORDER BY p.exp_number ASC
    `).all(studentId) as any[];

    // Fetch active live lab sessions
    const activeSessions = db.prepare(`
      SELECT ls.*, s.title as subject_title, s.code as subject_code
      FROM live_sessions ls
      JOIN subjects s ON ls.subject_id = s.id
      WHERE ls.status = 'active'
    `).all() as any[];

    const enriched = practicals.map(p => {
      let supported_languages = [];
      let starter_codes = {};
      let test_cases = [];
      let simultaneous_proof = null;

      try { supported_languages = JSON.parse(p.supported_languages); } catch {}
      try { starter_codes = JSON.parse(p.starter_codes); } catch {}
      try { test_cases = JSON.parse(p.test_cases); } catch {}
      try { simultaneous_proof = p.simultaneous_proof ? JSON.parse(p.simultaneous_proof) : null; } catch {}

      const activeSession = activeSessions.find(s => s.subject_id === p.subject_id || s.active_practical_id === p.id);

      return {
        ...p,
        supported_languages,
        starter_codes,
        test_cases,
        simultaneous_proof,
        submission_status: p.submission_status || 'not_started',
        has_active_session: !!activeSession,
        active_session: activeSession || null
      };
    });

    return NextResponse.json({
      practicals: enriched,
      activeSessions
    });
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
      exp_number,
      title,
      aim,
      theory,
      algorithm,
      supported_languages,
      default_language,
      starter_codes,
      test_cases,
      max_marks,
      due_date
    } = body;

    const id = `prac-${Date.now()}`;
    db.prepare(`
      INSERT INTO practicals (
        id, subject_id, exp_number, title, aim, theory, algorithm,
        supported_languages, default_language, starter_codes, test_cases,
        max_marks, due_date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      subject_id,
      exp_number || 1,
      title,
      aim,
      theory || '',
      algorithm || '',
      JSON.stringify(supported_languages || ['c', 'cpp', 'python', 'java']),
      default_language || 'cpp',
      JSON.stringify(starter_codes || {}),
      JSON.stringify(test_cases || []),
      max_marks || 10,
      due_date || new Date().toISOString(),
      new Date().toISOString()
    );

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
