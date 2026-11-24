import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'node:crypto';

export async function GET(req: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const practicalId = searchParams.get('practicalId');
    const status = searchParams.get('status');

    let query = `
      SELECT 
        sub.*,
        p.title as practical_title,
        p.exp_number,
        s.code as subject_code,
        s.title as subject_title,
        u.name as student_name,
        u.personal_id as student_personal_id,
        u.department as student_department,
        u.batch as student_batch
      FROM submissions sub
      JOIN practicals p ON sub.practical_id = p.id
      JOIN subjects s ON p.subject_id = s.id
      JOIN users u ON sub.student_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (studentId) {
      query += ` AND sub.student_id = ?`;
      params.push(studentId);
    }
    if (practicalId) {
      query += ` AND sub.practical_id = ?`;
      params.push(practicalId);
    }
    if (status) {
      query += ` AND sub.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY sub.updated_at DESC`;

    const rawSubmissions = db.prepare(query).all(...params) as any[];

    const submissions = rawSubmissions.map(s => {
      let simultaneous_proof = null;
      let test_results = null;
      try { simultaneous_proof = s.simultaneous_proof ? JSON.parse(s.simultaneous_proof) : null; } catch {}
      try { test_results = s.test_results ? JSON.parse(s.test_results) : null; } catch {}
      return {
        ...s,
        simultaneous_proof,
        test_results
      };
    });

    return NextResponse.json({ submissions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const db = getDb();
    const body = await req.json();
    const {
      practicalId,
      studentId,
      language,
      code,
      lastOutput,
      testResults,
      status, // 'draft' | 'in_progress' | 'submitted'
      sessionId,
      keystrokes,
      runCount
    } = body;

    if (!practicalId || !studentId) {
      return NextResponse.json({ error: 'practicalId and studentId are required' }, { status: 400 });
    }

    // Get student details
    const student = db.prepare('SELECT * FROM users WHERE id = ?').get(studentId) as any;
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Check if active session info
    let sessionCode = 'LAB-DIRECT';
    let labRoom = 'Campus Engineering Computing Hub';
    if (sessionId) {
      const sess = db.prepare('SELECT * FROM live_sessions WHERE id = ?').get(sessionId) as any;
      if (sess) {
        sessionCode = sess.session_code;
        labRoom = sess.lab_room;
      }
    }

    // Generate cryptographic proof hash for simultaneous lab verification
    const nowIso = new Date().toISOString();
    const hashData = `${student.personal_id}|${practicalId}|${sessionCode}|${nowIso}|${code.length}`;
    const verificationHash = 'SHA256:' + crypto.createHash('sha256').update(hashData).digest('hex');

    const proof = {
      session_code: sessionCode,
      lab_room: labRoom,
      joined_at: body.joinedAt || nowIso,
      submission_time: nowIso,
      run_count: runCount || 1,
      keystrokes: keystrokes || code.length,
      live_verified: false,
      verification_hash: verificationHash,
      tamper_proof_seal: status === 'submitted' ? 'SUBMITTED_AWAITING_STAFF_SIGNOFF' : 'IN_PROGRESS_DRAFT',
      ip_simulated: '192.168.104.' + (Math.floor(Math.random() * 200) + 10)
    };

    const subId = `sub-${studentId}-${practicalId}`;

    db.prepare(`
      INSERT INTO submissions (
        id, practical_id, student_id, student_personal_id, session_id,
        language, code, last_output, test_results, status,
        simultaneous_proof, max_marks, updated_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 10, ?, ?)
      ON CONFLICT(practical_id, student_id) DO UPDATE SET
        language = excluded.language,
        code = excluded.code,
        last_output = excluded.last_output,
        test_results = excluded.test_results,
        status = excluded.status,
        session_id = COALESCE(excluded.session_id, submissions.session_id),
        simultaneous_proof = excluded.simultaneous_proof,
        updated_at = excluded.updated_at
    `).run(
      subId,
      practicalId,
      studentId,
      student.personal_id,
      sessionId || null,
      language || 'cpp',
      code || '',
      lastOutput || '',
      testResults ? JSON.stringify(testResults) : null,
      status || 'in_progress',
      JSON.stringify(proof),
      nowIso,
      nowIso
    );

    const actualRow = db.prepare('SELECT id FROM submissions WHERE practical_id = ? AND student_id = ?').get(practicalId, studentId) as any;
    const finalSubId = actualRow?.id || subId;

    // Update live telemetry
    if (sessionId) {
      const testsPassed = Array.isArray(testResults) ? testResults.filter(t => t.passed).length : 0;
      const testsTotal = Array.isArray(testResults) ? testResults.length : 0;
      const statusLabel = status === 'submitted' ? 'Submitted for Verification 🚀' : 'Active Coding 💻';

      db.prepare(`
        INSERT INTO live_telemetry (
          student_id, session_id, practical_id, current_language,
          keystrokes_count, run_count, tests_passed, tests_total,
          status_label, last_heartbeat
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(student_id) DO UPDATE SET
          practical_id = excluded.practical_id,
          current_language = excluded.current_language,
          keystrokes_count = excluded.keystrokes_count,
          run_count = excluded.run_count,
          tests_passed = excluded.tests_passed,
          tests_total = excluded.tests_total,
          status_label = excluded.status_label,
          last_heartbeat = excluded.last_heartbeat
      `).run(
        studentId,
        sessionId,
        practicalId,
        language,
        keystrokes || 100,
        runCount || 1,
        testsPassed,
        testsTotal,
        statusLabel,
        nowIso
      );
    }

    return NextResponse.json({
      success: true,
      submissionId: finalSubId,
      proof,
      status
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
