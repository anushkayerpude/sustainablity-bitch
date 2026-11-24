import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'node:crypto';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const body = await req.json();
    const { marks_obtained, teacher_remarks, teacher_name, teacher_id, action } = body;

    let submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(id) as any;
    if (!submission && id.startsWith('sub-')) {
      // Allow fallback lookup by student_id and practical_id
      const matches = id.match(/^sub-([a-z0-9_-]+)-(prac-[a-z0-9_-]+)$/i);
      if (matches) {
        submission = db.prepare('SELECT * FROM submissions WHERE student_id = ? AND practical_id = ?').get(matches[1], matches[2]) as any;
      }
    }

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const isApproval = action !== 'reject';
    const newStatus = isApproval ? 'verified' : 'rejected';
    const nowIso = new Date().toISOString();

    let proof: any = {};
    try {
      proof = submission.simultaneous_proof ? JSON.parse(submission.simultaneous_proof) : {};
    } catch {}

    const digitalSignToken = `SIG-${(teacher_name || 'FACULTY').toUpperCase().replace(/\s+/g, '_')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const signatureStamp = isApproval
      ? `${teacher_name || 'Course Instructor'} [Verified Live | Digital Token: ${digitalSignToken}]`
      : `Rejected by ${teacher_name || 'Course Instructor'}`;

    proof.live_verified = isApproval;
    proof.teacher_signed_by = teacher_name || 'Course Instructor';
    proof.teacher_signed_at = nowIso;
    proof.tamper_proof_seal = isApproval
      ? `VERIFIED_LIVE_LAB_LECTURE_ORIGINAL_${digitalSignToken}`
      : `REJECTED_RESUBMISSION_REQUIRED`;

    db.prepare(`
      UPDATE submissions
      SET 
        status = ?,
        marks_obtained = ?,
        teacher_remarks = ?,
        teacher_signature = ?,
        verified_at = ?,
        simultaneous_proof = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      newStatus,
      isApproval ? (marks_obtained !== undefined ? marks_obtained : 10) : 0,
      teacher_remarks || (isApproval ? 'Lab practical verified during scheduled session.' : 'Requires revision.'),
      signatureStamp,
      nowIso,
      JSON.stringify(proof),
      nowIso,
      submission.id
    );

    // Update telemetry if active
    try {
      db.prepare(`
        UPDATE live_telemetry
        SET status_label = ?
        WHERE student_id = ?
      `).run(
        isApproval ? 'Verified by Faculty ✅' : 'Revision Requested ⚠️',
        submission.student_id
      );
    } catch {}

    return NextResponse.json({
      success: true,
      status: newStatus,
      signature: signatureStamp,
      verified_at: nowIso
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
