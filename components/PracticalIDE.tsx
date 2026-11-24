'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import confetti from 'canvas-confetti';
import { Practical, User, LiveSession, Submission } from '@/lib/types';
import {
  Play,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ShieldCheck,
  Cpu,
  ArrowLeft,
  Send,
  Radio,
  BookOpen,
  Terminal as TerminalIcon,
  Code2
} from 'lucide-react';

const Editor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-black text-zinc-400 font-mono text-xs">
      Loading Code Editor...
    </div>
  )
});

interface PracticalIDEProps {
  practicalId: string;
  currentUser: User;
  onBack: () => void;
  onSubmittedSuccess?: () => void;
}

export default function PracticalIDE({
  practicalId,
  currentUser,
  onBack,
  onSubmittedSuccess
}: PracticalIDEProps) {
  const [practical, setPractical] = useState<Practical | null>(null);
  const [activeSession, setActiveSession] = useState<LiveSession | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);

  // Editor states
  const [language, setLanguage] = useState<string>('cpp');
  const [code, setCode] = useState<string>('');
  const [customStdin, setCustomStdin] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'output' | 'stdin' | 'tests'>('output');

  // Execution states
  const [isRunning, setIsRunning] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string>('');
  const [testResults, setTestResults] = useState<any[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('Saved');
  const [keystrokes, setKeystrokes] = useState<number>(0);
  const [runs, setRuns] = useState<number>(0);

  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/practicals/${practicalId}?studentId=${currentUser.id}`);
      const data = await res.json();

      if (data.practical) {
        setPractical(data.practical);
        setActiveSession(data.activeSession);

        if (data.submission) {
          setSubmission(data.submission);
          setLanguage(data.submission.language || data.practical.default_language || 'cpp');
          setCode(data.submission.code || data.practical.starter_codes?.[data.submission.language] || '');
          if (data.submission.last_output) setTerminalOutput(data.submission.last_output);
          if (data.submission.test_results) setTestResults(data.submission.test_results);
        } else {
          const defLang = data.practical.default_language || 'cpp';
          setLanguage(defLang);
          setCode(data.practical.starter_codes?.[defLang] || '// Write your code here');
        }
      }
    } catch (err) {
      console.error('Error loading practical:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [practicalId, currentUser.id]);

  // Handle language switch
  const handleLanguageChange = (newLang: string) => {
    if (newLang === language) return;
    if (practical?.starter_codes?.[newLang]) {
      if (window.confirm(`Switch to ${newLang.toUpperCase()}? This will load the standard starter template.`)) {
        setLanguage(newLang);
        setCode(practical.starter_codes[newLang]);
        setTerminalOutput('');
        setTestResults(null);
      }
    } else {
      setLanguage(newLang);
    }
  };

  // Reset code
  const handleReset = () => {
    if (!practical?.starter_codes?.[language]) return;
    if (window.confirm('Reset code to starter template?')) {
      setCode(practical.starter_codes[language]);
      setTerminalOutput('');
      setTestResults(null);
    }
  };

  // Handle typing & auto-save
  const handleCodeChange = (newVal?: string) => {
    const val = newVal || '';
    setCode(val);
    setKeystrokes(prev => prev + 1);
    setSaveStatus('Saving...');

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      try {
        await fetch('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            practicalId,
            studentId: currentUser.id,
            language,
            code: val,
            lastOutput: terminalOutput,
            testResults,
            status: submission?.status === 'verified' ? 'verified' : 'in_progress',
            sessionId: activeSession?.id || null,
            keystrokes,
            runCount: runs
          })
        });
        setSaveStatus(`Saved at ${new Date().toLocaleTimeString()}`);
      } catch {
        setSaveStatus('Save offline');
      }
    }, 2500);
  };

  // Run Code
  const handleRunCode = async () => {
    if (!code.trim()) return;
    setIsRunning(true);
    setActiveTab('output');
    setTerminalOutput('Compiling and running...\n');
    setRuns(prev => prev + 1);

    try {
      const res = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          code,
          stdin: customStdin,
          studentId: currentUser.id,
          sessionId: activeSession?.id || null,
          practicalId,
          keystrokes
        })
      });

      const data = await res.json();
      if (data.execution) {
        let out = '';
        if (data.execution.compileOutput) out += `${data.execution.compileOutput}\n\n`;
        if (data.execution.stdout) out += data.execution.stdout;
        if (data.execution.stderr) out += (out ? '\n' : '') + `[STDERR]:\n${data.execution.stderr}`;
        if (!out) out = '[Program finished with no output]';

        setTerminalOutput(out);
      } else {
        setTerminalOutput(data.error || 'Execution failed');
      }
    } catch (err: any) {
      setTerminalOutput(`Error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Run Test Cases
  const handleRunTests = async () => {
    if (!practical?.test_cases?.length) {
      handleRunCode();
      return;
    }

    setIsRunning(true);
    setActiveTab('tests');
    setRuns(prev => prev + 1);

    try {
      const res = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          code,
          testCases: practical.test_cases,
          studentId: currentUser.id,
          sessionId: activeSession?.id || null,
          practicalId,
          keystrokes
        })
      });

      const data = await res.json();
      if (data.testSuite) {
        setTestResults(data.testSuite.testResults);
        if (data.testSuite.allPassed) {
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        }
      }
      if (data.execution?.stdout) {
        setTerminalOutput(data.execution.stdout);
      }
    } catch (err: any) {
      alert(`Test run error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Submit to Teacher
  const handleSubmit = async () => {
    if (!code.trim()) {
      alert('Please write code before submitting.');
      return;
    }

    if (!window.confirm('Submit this practical to your teacher? It will be verified and digitally signed without any paper printout.')) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          practicalId,
          studentId: currentUser.id,
          language,
          code,
          lastOutput: terminalOutput,
          testResults,
          status: 'submitted',
          sessionId: activeSession?.id || null,
          keystrokes,
          runCount: runs
        })
      });

      const data = await res.json();
      if (data.success) {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
        alert('🎉 Submitted successfully! Your teacher can now review and sign it in their live dashboard.');
        fetchData();
        if (onSubmittedSuccess) onSubmittedSuccess();
      } else {
        alert(data.error || 'Submission failed');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[75vh] flex flex-col items-center justify-center text-zinc-400 space-y-3">
        <Cpu className="w-8 h-8 animate-spin text-[#9d6878]" />
        <p className="text-xs font-bold uppercase tracking-wider">Loading Code Environment...</p>
      </div>
    );
  }

  if (!practical) {
    return (
      <div className="p-8 text-center text-zinc-300">
        <p>Practical not found.</p>
        <button onClick={onBack} className="mt-2 text-[#c9a0aa] underline">Back</button>
      </div>
    );
  }

  const isVerified = submission?.status === 'verified';

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] bg-black text-white rounded-2xl overflow-hidden border border-zinc-800">
      
      {/* Top Header Bar */}
      <div className="bg-zinc-950 border-b border-zinc-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        
        {/* Left: Back & Title */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="flex items-center space-x-1 text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-zinc-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase text-[#c9a0aa]">
                EXP {practical.exp_number}
              </span>
              <span className="text-xs font-bold text-white truncate max-w-xs sm:max-w-md">
                {practical.title}
              </span>
            </div>
            <div className="text-[10px] text-zinc-500">
              Student ID: <span className="font-mono text-zinc-300">{currentUser.personal_id}</span> • {saveStatus}
            </div>
          </div>
        </div>

        {/* Center: Language Switcher */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg">
            <Code2 className="w-3.5 h-3.5 text-[#c9a0aa]" />
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              {practical.supported_languages.map(lang => (
                <option key={lang} value={lang} className="bg-black text-white">
                  {lang === 'cpp' ? 'C++' : lang === 'c' ? 'C' : lang === 'python' ? 'Python 3' : lang === 'java' ? 'Java' : lang === 'javascript' ? 'JavaScript' : lang === 'sql' ? 'SQL' : lang.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleReset}
            title="Reset code"
            className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-zinc-800"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className="flex items-center space-x-1.5 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 text-[#c9a0aa] fill-[#c9a0aa] ${isRunning ? 'animate-spin' : ''}`} />
            <span>Run Code</span>
          </button>

          {practical.test_cases?.length ? (
            <button
              onClick={handleRunTests}
              disabled={isRunning}
              className="flex items-center space-x-1.5 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Test Cases</span>
            </button>
          ) : null}

          {isVerified ? (
            <div className="flex items-center space-x-1 bg-zinc-900 border border-[#8b5a68] text-[#c9a0aa] px-3 py-1.5 rounded-lg text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-[#c9a0aa]" />
              <span>Checked ({submission.marks_obtained}/{practical.max_marks})</span>
            </div>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center space-x-1.5 bg-[#8b5a68] hover:bg-[#9d6878] text-white px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all shadow-lg shadow-[#8b5a68]/30 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit to Teacher</span>
            </button>
          )}
        </div>

      </div>

      {/* Main Area: Split Screen */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        
        {/* Left Side (4 cols): Aim & Test Cases */}
        <div className="lg:col-span-4 border-r border-zinc-800 bg-zinc-950 overflow-y-auto p-4 space-y-4">
          
          {/* Live Lab Presence Badge */}
          <div className="bg-black border border-zinc-800 rounded-xl p-3 text-xs space-y-1">
            <div className="flex items-center justify-between text-[#c9a0aa] font-bold text-[10px] uppercase">
              <span className="flex items-center space-x-1">
                <Radio className="w-3 h-3 text-[#c9a0aa] animate-pulse" />
                <span>Live Lab Presence</span>
              </span>
              <span>{activeSession ? activeSession.session_code : 'LOCAL LAB'}</span>
            </div>
            <div className="text-[11px] text-zinc-300">
              Student ID: <strong className="text-white font-mono">{currentUser.personal_id}</strong>
            </div>
            <div className="text-[10px] text-zinc-500">
              {keystrokes} keystrokes • {runs} runs logged
            </div>
          </div>

          {/* Aim of Experiment */}
          <div className="bg-black border border-zinc-800 rounded-xl p-3.5">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5 mb-1">
              <BookOpen className="w-3.5 h-3.5 text-[#c9a0aa]" />
              <span>Aim of Experiment</span>
            </h4>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {practical.aim}
            </p>
          </div>

          {/* Algorithm */}
          {practical.algorithm && (
            <div className="bg-black border border-zinc-800 rounded-xl p-3.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
                Algorithm & Steps
              </h4>
              <div className="text-xs text-zinc-300 whitespace-pre-line leading-relaxed font-sans">
                {practical.algorithm}
              </div>
            </div>
          )}

          {/* Test cases list */}
          {practical.test_cases?.length ? (
            <div className="bg-black border border-zinc-800 rounded-xl p-3.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
                Sample Test Cases
              </h4>
              <div className="space-y-2">
                {practical.test_cases.map((tc, idx) => (
                  <div key={tc.id || idx} className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-800 text-[11px] font-mono">
                    <div className="text-zinc-400 font-bold mb-0.5">Case {idx + 1}:</div>
                    {tc.input && <div><span className="text-zinc-500">Input:</span> {tc.input}</div>}
                    <div><span className="text-zinc-500">Expected:</span> <span className="text-[#c9a0aa] font-bold">{tc.expected_output}</span></div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

        </div>

        {/* Right Side (8 cols): Editor and Console */}
        <div className="lg:col-span-8 flex flex-col overflow-hidden bg-black">
          
          {/* Monaco Editor */}
          <div className="flex-1 relative overflow-hidden min-h-[300px]">
            <Editor
              height="100%"
              language={language === 'c' ? 'c' : language === 'cpp' ? 'cpp' : language === 'python' ? 'python' : language === 'java' ? 'java' : language === 'javascript' ? 'javascript' : language === 'sql' ? 'sql' : 'plaintext'}
              value={code}
              theme="vs-dark"
              onChange={handleCodeChange}
              options={{
                fontSize: 13,
                fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true,
                lineNumbers: 'on',
                padding: { top: 12 }
              }}
            />
          </div>

          {/* Bottom Console */}
          <div className="h-60 border-t border-zinc-800 bg-zinc-950 flex flex-col shrink-0">
            
            {/* Tabs */}
            <div className="flex items-center space-x-4 border-b border-zinc-800 px-4 bg-black text-xs shrink-0">
              <button
                onClick={() => setActiveTab('output')}
                className={`py-2 font-bold border-b-2 transition-all flex items-center space-x-1.5 ${
                  activeTab === 'output' ? 'border-[#9d6878] text-[#c9a0aa]' : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                <TerminalIcon className="w-3.5 h-3.5" />
                <span>Output Console</span>
              </button>

              <button
                onClick={() => setActiveTab('stdin')}
                className={`py-2 font-bold border-b-2 transition-all ${
                  activeTab === 'stdin' ? 'border-[#9d6878] text-[#c9a0aa]' : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                Custom Input (stdin)
              </button>

              <button
                onClick={() => setActiveTab('tests')}
                className={`py-2 font-bold border-b-2 transition-all ${
                  activeTab === 'tests' ? 'border-[#9d6878] text-[#c9a0aa]' : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                Test Results
              </button>
            </div>

            {/* Console Body */}
            <div className="flex-1 p-3 overflow-y-auto font-mono text-xs">
              {activeTab === 'output' && (
                <pre className="text-zinc-200 whitespace-pre-wrap select-text leading-relaxed">
                  {terminalOutput || '> Click [Run Code] to see compiler output.'}
                </pre>
              )}

              {activeTab === 'stdin' && (
                <div className="h-full flex flex-col space-y-1.5">
                  <span className="text-[11px] text-zinc-400 font-sans">
                    Enter standard input for cin, scanf, input(), or System.in:
                  </span>
                  <textarea
                    value={customStdin}
                    onChange={(e) => setCustomStdin(e.target.value)}
                    placeholder="Input data..."
                    className="flex-1 bg-black border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#9d6878] font-mono resize-none"
                  />
                </div>
              )}

              {activeTab === 'tests' && (
                <div className="space-y-2">
                  {!testResults ? (
                    <div className="text-zinc-400 text-center py-4 font-sans text-xs">
                      No test run yet. Click "Test Cases" above.
                    </div>
                  ) : (
                    testResults.map((tr, idx) => (
                      <div
                        key={tr.id || idx}
                        className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                          tr.passed
                            ? 'bg-zinc-900 border-zinc-700 text-zinc-200'
                            : 'bg-zinc-950 border-rose-900 text-rose-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          {tr.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400" />
                          )}
                          <span className="font-bold">Case {idx + 1}: {tr.passed ? 'PASSED' : 'FAILED'}</span>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {tr.executionTimeMs}ms
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
