import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId') || 'student-1';

    const assignments = db.prepare(`
      SELECT 
        a.*,
        s.code as subject_code,
        s.title as subject_title,
        asub.id as submission_id,
        asub.code as submitted_code,
        asub.notes as submitted_notes,
        asub.status as submission_status,
        asub.marks as marks_obtained,
        asub.feedback as teacher_feedback,
        asub.submitted_at
      FROM assignments a
      JOIN subjects s ON a.subject_id = s.id
      LEFT JOIN assignment_submissions asub ON asub.assignment_id = a.id AND asub.student_id = ?
      ORDER BY a.due_date ASC
    `).all(studentId) as any[];

    const enriched = assignments.map(a => {
      let supported_languages = [];
      let test_cases = [];
      try { supported_languages = JSON.parse(a.supported_languages); } catch {}
      try { test_cases = a.test_cases ? JSON.parse(a.test_cases) : []; } catch {}

      return {
        ...a,
        supported_languages,
        test_cases,
        submission_status: a.submission_status || 'pending'
      };
    });

    return NextResponse.json({ assignments: enriched });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const db = getDb();
    const body = await req.json();
    const { assignment_id, student_id, code, notes } = body;

    const student = db.prepare('SELECT * FROM users WHERE id = ?').get(student_id) as any;
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    const subId = `asub-${student_id}-${assignment_id}`;

    db.prepare(`
      INSERT INTO assignment_submissions (
        id, assignment_id, student_id, student_personal_id,
        code, notes, status, marks, feedback, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'submitted', NULL, NULL, ?)
      ON CONFLICT(assignment_id, student_id) DO UPDATE SET
        code = excluded.code,
        notes = excluded.notes,
        status = 'submitted',
        submitted_at = excluded.submitted_at
    `).run(
      subId,
      assignment_id,
      student_id,
      student.personal_id,
      code || '',
      notes || '',
      nowIso
    );

    return NextResponse.json({
      success: true,
      submissionId: subId,
      submitted_at: nowIso
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
