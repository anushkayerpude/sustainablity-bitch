import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;
    const db = getDb();

    const student = db.prepare('SELECT * FROM users WHERE id = ?').get(studentId) as any;
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const verifiedSubmissions = db.prepare(`
      SELECT 
        sub.*,
        p.exp_number,
        p.title as practical_title,
        p.aim,
        p.theory,
        p.algorithm,
        s.code as subject_code,
        s.title as subject_title,
        s.department as subject_dept
      FROM submissions sub
      JOIN practicals p ON sub.practical_id = p.id
      JOIN subjects s ON p.subject_id = s.id
      WHERE sub.student_id = ? AND sub.status = 'verified'
      ORDER BY s.code ASC, p.exp_number ASC
    `).all(studentId) as any[];

    const parsedSubmissions = verifiedSubmissions.map(s => {
      let proof = null;
      let test_results = null;
      try { proof = s.simultaneous_proof ? JSON.parse(s.simultaneous_proof) : null; } catch {}
      try { test_results = s.test_results ? JSON.parse(s.test_results) : null; } catch {}
      return {
        ...s,
        simultaneous_proof: proof,
        test_results
      };
    });

    const pagesSaved = parsedSubmissions.length * 14; // Average 14 printed journal pages saved per practical
    const moneySavedInr = pagesSaved * 5; // ~₹5 per printed page (color & spiral binding)

    return NextResponse.json({
      institution: {
        college_name: 'Apex Institute of Engineering & Technology',
        department: student.department || 'Department of Computer Engineering',
        academic_year: 'Academic Year 2026-2027',
        accreditation: 'Approved by AICTE & Accredited by NBA (Tier-1)',
        document_title: 'OFFICIAL CONTINUOUS ASSESSMENT DIGITAL LAB JOURNAL'
      },
      student,
      summary: {
        total_verified: parsedSubmissions.length,
        average_marks: parsedSubmissions.length > 0 
          ? (parsedSubmissions.reduce((acc, curr) => acc + (curr.marks_obtained || 0), 0) / parsedSubmissions.length).toFixed(1)
          : '0.0',
        pages_saved: pagesSaved,
        money_saved_inr: moneySavedInr,
        carbon_offset_kg: (pagesSaved * 0.05).toFixed(2)
      },
      practicals: parsedSubmissions
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
