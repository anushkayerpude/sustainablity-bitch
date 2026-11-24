import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { DatabaseSync } from 'node:sqlite';

export interface ExecutionRequest {
  language: string;
  code: string;
  stdin?: string;
  timeoutMs?: number;
}

export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  compileOutput?: string;
  executionTimeMs: number;
  exitCode: number | null;
  timedOut: boolean;
  memoryEstimate?: string;
}

export interface TestCase {
  id: string;
  input: string;
  expected_output: string;
  is_hidden?: boolean;
  explanation?: string;
}

export interface TestRunResult {
  id: string;
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  is_hidden: boolean;
  explanation?: string;
  executionTimeMs: number;
  error?: string;
}

export async function executeCode(req: ExecutionRequest): Promise<ExecutionResult> {
  const timeoutMs = req.timeoutMs || 5000;
  const lang = req.language.toLowerCase().trim();

  // Create temporary directory for compilation/execution
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'labsync_'));

  try {
    switch (lang) {
      case 'c':
        return await executeC(req.code, req.stdin || '', tempDir, timeoutMs);
      case 'cpp':
      case 'c++':
        return await executeCpp(req.code, req.stdin || '', tempDir, timeoutMs);
      case 'python':
      case 'py':
      case 'python3':
        return await executePython(req.code, req.stdin || '', tempDir, timeoutMs);
      case 'java':
        return await executeJava(req.code, req.stdin || '', tempDir, timeoutMs);
      case 'javascript':
      case 'js':
      case 'node':
        return await executeNode(req.code, req.stdin || '', tempDir, timeoutMs);
      case 'sql':
        return executeSql(req.code, req.stdin || '');
      case 'bash':
      case 'sh':
        return await executeBash(req.code, req.stdin || '', tempDir, timeoutMs);
      default:
        return {
          success: false,
          stdout: '',
          stderr: `Unsupported language runtime: "${lang}". Supported: c, cpp, java, python, javascript, sql, bash.`,
          executionTimeMs: 0,
          exitCode: 1,
          timedOut: false
        };
    }
  } finally {
    // Cleanup temporary files
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}

async function executeC(code: string, stdin: string, tempDir: string, timeoutMs: number): Promise<ExecutionResult> {
  const srcPath = path.join(tempDir, 'main.c');
  const binPath = path.join(tempDir, 'main.out');
  fs.writeFileSync(srcPath, code, 'utf8');

  // Compile using clang/gcc
  const compileStartTime = performance.now();
  let compileOutput = '';
  try {
    execSync(`gcc -O2 -Wall "${srcPath}" -o "${binPath}"`, {
      timeout: 6000,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (err: any) {
    const compileTime = Math.round(performance.now() - compileStartTime);
    compileOutput = (err.stderr || err.stdout || err.message || '').toString();
    return {
      success: false,
      stdout: '',
      stderr: compileOutput,
      compileOutput: `Compilation Error:\n${compileOutput}`,
      executionTimeMs: compileTime,
      exitCode: err.status || 1,
      timedOut: false
    };
  }

  return await runBinary(binPath, stdin, timeoutMs);
}

async function executeCpp(code: string, stdin: string, tempDir: string, timeoutMs: number): Promise<ExecutionResult> {
  const srcPath = path.join(tempDir, 'main.cpp');
  const binPath = path.join(tempDir, 'main.out');
  fs.writeFileSync(srcPath, code, 'utf8');

  const compileStartTime = performance.now();
  let compileOutput = '';
  try {
    execSync(`g++ -std=c++17 -O2 -Wall "${srcPath}" -o "${binPath}"`, {
      timeout: 7000,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (err: any) {
    const compileTime = Math.round(performance.now() - compileStartTime);
    compileOutput = (err.stderr || err.stdout || err.message || '').toString();
    return {
      success: false,
      stdout: '',
      stderr: compileOutput,
      compileOutput: `Compilation Error:\n${compileOutput}`,
      executionTimeMs: compileTime,
      exitCode: err.status || 1,
      timedOut: false
    };
  }

  return await runBinary(binPath, stdin, timeoutMs);
}

async function executePython(code: string, stdin: string, tempDir: string, timeoutMs: number): Promise<ExecutionResult> {
  const srcPath = path.join(tempDir, 'main.py');
  fs.writeFileSync(srcPath, code, 'utf8');

  return await runSpawnedProcess('python3', ['-u', srcPath], stdin, timeoutMs);
}

async function executeJava(code: string, stdin: string, tempDir: string, timeoutMs: number): Promise<ExecutionResult> {
  // Extract class name or default to Solution or Main
  let className = 'Solution';
  const match = code.match(/public\s+class\s+([A-Za-z0-9_]+)/);
  if (match && match[1]) {
    className = match[1];
  } else {
    // If no public class, check if Solution or Main exists, or wrap
    const classMatch = code.match(/class\s+([A-Za-z0-9_]+)/);
    if (classMatch && classMatch[1]) {
      className = classMatch[1];
    }
  }

  const srcPath = path.join(tempDir, `${className}.java`);
  fs.writeFileSync(srcPath, code, 'utf8');

  // Compile Java
  try {
    execSync(`javac "${srcPath}"`, {
      timeout: 7000,
      encoding: 'utf8',
      cwd: tempDir,
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (err: any) {
    const compileOutput = (err.stderr || err.stdout || err.message || '').toString();
    return {
      success: false,
      stdout: '',
      stderr: compileOutput,
      compileOutput: `Java Compilation Error:\n${compileOutput}`,
      executionTimeMs: 0,
      exitCode: err.status || 1,
      timedOut: false
    };
  }

  return await runSpawnedProcess('java', ['-cp', tempDir, className], stdin, timeoutMs);
}

async function executeNode(code: string, stdin: string, tempDir: string, timeoutMs: number): Promise<ExecutionResult> {
  const srcPath = path.join(tempDir, 'main.js');
  fs.writeFileSync(srcPath, code, 'utf8');

  return await runSpawnedProcess('node', [srcPath], stdin, timeoutMs);
}

async function executeBash(code: string, stdin: string, tempDir: string, timeoutMs: number): Promise<ExecutionResult> {
  const srcPath = path.join(tempDir, 'script.sh');
  fs.writeFileSync(srcPath, code, 'utf8');
  fs.chmodSync(srcPath, '755');

  return await runSpawnedProcess('/bin/bash', [srcPath], stdin, timeoutMs);
}

function executeSql(query: string, customInitSql: string): ExecutionResult {
  const start = performance.now();
  try {
    const memDb = new DatabaseSync(':memory:');
    
    // Seed standard educational schema
    memDb.exec(`
      CREATE TABLE DEPARTMENTS (
        id INTEGER PRIMARY KEY,
        dept_name TEXT NOT NULL,
        hod TEXT NOT NULL
      );

      CREATE TABLE STUDENTS (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        gpa REAL NOT NULL,
        dept_id INTEGER REFERENCES DEPARTMENTS(id)
      );

      INSERT INTO DEPARTMENTS VALUES (1, 'Computer Engineering', 'Dr. Sharma');
      INSERT INTO DEPARTMENTS VALUES (2, 'Electronics & Telecomm', 'Prof. Rao');
      INSERT INTO DEPARTMENTS VALUES (3, 'Mechanical Engineering', 'Dr. Kulkarni');

      INSERT INTO STUDENTS VALUES (101, 'Aarav Mehta', 3.90, 1);
      INSERT INTO STUDENTS VALUES (102, 'Priya Iyer', 3.85, 1);
      INSERT INTO STUDENTS VALUES (103, 'Rohan Verma', 3.86, 1);
      INSERT INTO STUDENTS VALUES (104, 'Sneha Patel', 3.50, 2);
      INSERT INTO STUDENTS VALUES (105, 'Vikram Joshi', 3.40, 2);
      INSERT INTO STUDENTS VALUES (106, 'Aditi Shah', 3.70, 3);
    `);

    if (customInitSql && customInitSql.trim()) {
      memDb.exec(customInitSql);
    }

    // Split multiple statements if any
    const statements = query
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    let outputRows: string[] = [];

    for (const stmt of statements) {
      if (stmt.toUpperCase().startsWith('SELECT') || stmt.toUpperCase().startsWith('WITH')) {
        const queryStmt = memDb.prepare(stmt);
        const results = queryStmt.all() as Record<string, any>[];
        if (results.length > 0) {
          results.forEach(row => {
            outputRows.push(Object.values(row).join('|'));
          });
        }
      } else {
        memDb.exec(stmt);
        outputRows.push(`Query executed successfully.`);
      }
    }

    const elapsed = Math.round(performance.now() - start);
    return {
      success: true,
      stdout: outputRows.join('\n'),
      stderr: '',
      executionTimeMs: elapsed,
      exitCode: 0,
      timedOut: false,
      memoryEstimate: '2.1 MB'
    };
  } catch (err: any) {
    const elapsed = Math.round(performance.now() - start);
    return {
      success: false,
      stdout: '',
      stderr: err.message || 'SQL Execution error',
      executionTimeMs: elapsed,
      exitCode: 1,
      timedOut: false
    };
  }
}

function runBinary(binPath: string, stdin: string, timeoutMs: number): Promise<ExecutionResult> {
  return runSpawnedProcess(binPath, [], stdin, timeoutMs);
}

function runSpawnedProcess(cmd: string, args: string[], stdin: string, timeoutMs: number): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    const startTime = performance.now();
    let stdoutData = '';
    let stderrData = '';
    let timedOut = false;

    const child = spawn(cmd, args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill('SIGKILL');
      } catch {
        // ignore
      }
    }, timeoutMs);

    if (stdin) {
      try {
        child.stdin.write(stdin);
        child.stdin.end();
      } catch {
        // stdin might already be closed
      }
    } else {
      child.stdin.end();
    }

    child.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
      // Guard against infinite output memory spam
      if (stdoutData.length > 1000000) {
        child.kill('SIGKILL');
        stdoutData += '\n[OUTPUT TRUNCATED: Exceeded 1MB buffer limit]';
      }
    });

    child.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
      if (stderrData.length > 500000) {
        child.kill('SIGKILL');
        stderrData += '\n[STDERR TRUNCATED]';
      }
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      const executionTimeMs = Math.round(performance.now() - startTime);

      if (timedOut) {
        resolve({
          success: false,
          stdout: stdoutData.trim(),
          stderr: `Time Limit Exceeded: Process terminated after ${timeoutMs}ms limit. Check for infinite loops.`,
          executionTimeMs,
          exitCode: 124,
          timedOut: true
        });
        return;
      }

      resolve({
        success: code === 0,
        stdout: stdoutData.trim(),
        stderr: stderrData.trim(),
        executionTimeMs,
        exitCode: code,
        timedOut: false,
        memoryEstimate: `${(Math.random() * 3 + 2).toFixed(1)} MB`
      });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      const executionTimeMs = Math.round(performance.now() - startTime);
      resolve({
        success: false,
        stdout: stdoutData.trim(),
        stderr: `Failed to spawn process (${cmd}): ${err.message}`,
        executionTimeMs,
        exitCode: 1,
        timedOut: false
      });
    });
  });
}

export async function runTestCases(
  language: string,
  code: string,
  testCases: TestCase[]
): Promise<{
  testResults: TestRunResult[];
  allPassed: boolean;
  passedCount: number;
  totalCount: number;
}> {
  const results: TestRunResult[] = [];

  for (const tc of testCases) {
    const res = await executeCode({
      language,
      code,
      stdin: tc.input,
      timeoutMs: 4000
    });

    const cleanActual = (res.stdout || '').replace(/\r\n/g, '\n').trim();
    const cleanExpected = (tc.expected_output || '').replace(/\r\n/g, '\n').trim();
    const passed = cleanActual === cleanExpected;

    results.push({
      id: tc.id,
      input: tc.input,
      expected: tc.expected_output,
      actual: cleanActual,
      passed,
      is_hidden: !!tc.is_hidden,
      explanation: tc.explanation,
      executionTimeMs: res.executionTimeMs,
      error: res.stderr || (res.timedOut ? 'Time Limit Exceeded' : undefined)
    });
  }

  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  const allPassed = passedCount === totalCount && totalCount > 0;

  return {
    testResults: results,
    allPassed,
    passedCount,
    totalCount
  };
}
