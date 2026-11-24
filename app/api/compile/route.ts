import { NextResponse } from 'next/server';
import { executeCode, runTestCases } from '@/lib/compiler';
import { getDb } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { language, code, stdin, testCases, studentId, sessionId, practicalId, keystrokes } = body;

    if (!code || !language) {
      return NextResponse.json({ error: 'Code and language are required.' }, { status: 400 });
    }

    let result;
    let testSuiteResult = null;

    if (testCases && Array.isArray(testCases) && testCases.length > 0) {
      testSuiteResult = await runTestCases(language, code, testCases);
      // Run custom stdin or first test case for standard output view
      result = await executeCode({
        language,
        code,
        stdin: stdin !== undefined ? stdin : testCases[0]?.input || '',
        timeoutMs: 4000
      });
    } else {
      result = await executeCode({
        language,
        code,
        stdin: stdin || '',
        timeoutMs: 4000
      });
    }

    // If telemetry context exists, update live lab radar
    if (studentId && sessionId) {
      try {
        const db = getDb();
        const testsPassed = testSuiteResult ? testSuiteResult.passedCount : 0;
        const testsTotal = testSuiteResult ? testSuiteResult.totalCount : 0;
        const statusLabel = testSuiteResult
          ? (testSuiteResult.allPassed ? 'All Tests Passed 🎉' : `${testsPassed}/${testsTotal} Tests Passed`)
          : (result.success ? 'Executed Successfully' : 'Compile / Runtime Error');

        db.prepare(`
          INSERT INTO live_telemetry (student_id, session_id, practical_id, current_language, keystrokes_count, run_count, tests_passed, tests_total, status_label, last_heartbeat)
          VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
          ON CONFLICT(student_id) DO UPDATE SET
            session_id = excluded.session_id,
            practical_id = excluded.practical_id,
            current_language = excluded.current_language,
            keystrokes_count = keystrokes_count + ?,
            run_count = run_count + 1,
            tests_passed = excluded.tests_passed,
            tests_total = excluded.tests_total,
            status_label = excluded.status_label,
            last_heartbeat = excluded.last_heartbeat
        `).run(
          studentId,
          sessionId,
          practicalId || '',
          language,
          keystrokes || 20,
          testsPassed,
          testsTotal,
          statusLabel,
          new Date().toISOString(),
          keystrokes || 20
        );
      } catch (dbErr) {
        console.error('Telemetry update error:', dbErr);
      }
    }

    return NextResponse.json({
      execution: result,
      testSuite: testSuiteResult
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Execution failed' }, { status: 500 });
  }
}
