import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId') || 'student-1';

    const practical = db.prepare(`
      SELECT 
        p.*,
        s.code as subject_code,
        s.title as subject_title,
        s.department as subject_department
      FROM practicals p
      JOIN subjects s ON p.subject_id = s.id
      WHERE p.id = ?
    `).get(id) as any;

    if (!practical) {
      return NextResponse.json({ error: 'Practical not found' }, { status: 404 });
    }

    const submission = db.prepare(`
      SELECT * FROM submissions
      WHERE practical_id = ? AND student_id = ?
    `).get(id, studentId) as any;

    // Active session for this practical or subject
    const activeSession = db.prepare(`
      SELECT ls.*, s.title as subject_title, s.code as subject_code, u.name as teacher_name
      FROM live_sessions ls
      JOIN subjects s ON ls.subject_id = s.id
      JOIN users u ON ls.teacher_id = u.id
      WHERE ls.status = 'active' AND (ls.active_practical_id = ? OR ls.subject_id = ?)
    `).get(id, practical.subject_id) as any;

    let supported_languages = [];
    let starter_codes: Record<string, string> = {};
    let test_cases = [];
    let simultaneous_proof = null;
    let test_results = null;

    try { supported_languages = JSON.parse(practical.supported_languages); } catch {}
    try { starter_codes = JSON.parse(practical.starter_codes); } catch {}
    try { test_cases = JSON.parse(practical.test_cases); } catch {}

    if (submission) {
      try { simultaneous_proof = submission.simultaneous_proof ? JSON.parse(submission.simultaneous_proof) : null; } catch {}
      try { test_results = submission.test_results ? JSON.parse(submission.test_results) : null; } catch {}
    }

    return NextResponse.json({
      practical: {
        ...practical,
        supported_languages,
        starter_codes,
        test_cases
      },
      submission: submission ? {
        ...submission,
        simultaneous_proof,
        test_results
      } : null,
      activeSession: activeSession || null
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
