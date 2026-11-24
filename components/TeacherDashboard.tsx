'use client';

import React, { useState, useEffect } from 'react';
import { User, LiveSession } from '@/lib/types';
import {
  Radio,
  Play,
  CheckCircle2,
  ShieldCheck,
  Award,
  Users,
  FileCode,
  Terminal,
  X,
  RotateCw,
  LogOut,
  Plus,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TeacherDashboardProps {
  currentUser: User;
  onRefreshPracticals?: () => void;
}

export default function TeacherDashboard({
  currentUser,
  onRefreshPracticals
}: TeacherDashboardProps) {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [activeSession, setActiveSession] = useState<LiveSession | null>(null);
  const [telemetry, setTelemetry] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [reviewSub, setReviewSub] = useState<any | null>(null);
  const [marks, setMarks] = useState<number>(10);
  const [remarks, setRemarks] = useState<string>('Verified live in lab. Well implemented.');
  const [isVerifying, setIsVerifying] = useState(false);

  // New session state
  const [newSub, setNewSub] = useState('sub-1');
  const [newRoom, setNewRoom] = useState('Lab Hall 304 (Turing Computing Lab)');
  const [newBatch, setNewBatch] = useState('Batch A1');

  const fetchData = async () => {
    try {
      setLoading(true);
      const sRes = await fetch('/api/sessions');
      const sData = await sRes.json();
      if (sData.sessions) {
        setSessions(sData.sessions);
        const active = sData.sessions.find((s: LiveSession) => s.status === 'active');
        setActiveSession(active || null);

        if (active) {
          const tRes = await fetch(`/api/sessions/${active.id}/live`);
          const tData = await tRes.json();
          if (tData.telemetry) setTelemetry(tData.telemetry);
        }
      }

      const subRes = await fetch('/api/submissions');
      const subData = await subRes.json();
      if (subData.submissions) setSubmissions(subData.submissions);
    } catch (err) {
      console.error('Error fetching teacher data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_id: newSub,
          teacher_id: currentUser.id,
          lab_room: newRoom,
          batch: newBatch,
          duration_minutes: 120
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Lab Lecture Started! Room Code: ${data.session_code}`);
        setIsCreateOpen(false);
        fetchData();
        if (onRefreshPracticals) onRefreshPracticals();
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleEndSession = async (sessionId: string) => {
    if (!window.confirm('End this lab lecture session?')) return;
    try {
      await fetch('/api/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, action: 'end' })
      });
      fetchData();
      if (onRefreshPracticals) onRefreshPracticals();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleOpenReview = (sub: any) => {
    setReviewSub(sub);
    setMarks(sub.marks_obtained !== null ? sub.marks_obtained : 10);
    setRemarks(sub.teacher_remarks || 'Verified live in lab lecture.');
  };

  const handleVerify = async (action: 'approve' | 'reject') => {
    if (!reviewSub) return;
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/submissions/${reviewSub.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marks_obtained: marks,
          teacher_remarks: remarks,
          teacher_name: currentUser.name,
          teacher_id: currentUser.id,
          action
        })
      });
      const data = await res.json();
      if (data.success) {
        if (action === 'approve') {
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 } });
          alert('Practical signed and verified with digital token!');
        } else {
          alert('Practical returned for revision.');
        }
        setReviewSub(null);
        fetchData();
        if (onRefreshPracticals) onRefreshPracticals();
      }
    } catch (err: any) {
      alert(`Verification error: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const pending = submissions.filter(s => s.status === 'submitted');
  const verified = submissions.filter(s => s.status === 'verified');

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-[#c9a0aa] text-xs font-bold uppercase tracking-wider mb-1">
            <Radio className="w-4 h-4 text-[#c9a0aa] animate-pulse" />
            <span>Faculty Lab Monitor</span>
          </div>
          <h2 className="text-2xl font-black text-white">
            Live Lab Radar & Continuous Assessment
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-lg">
            See students writing code live in the lab room, check test passes, and digitally sign without any printed paper.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center space-x-2 bg-[#8b5a68] hover:bg-[#9d6878] text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-md shadow-[#8b5a68]/30"
        >
          <Plus className="w-4 h-4" />
          <span>Start Lab Lecture</span>
        </button>
      </div>

      {/* Active Session Card */}
      {activeSession ? (
        <div className="bg-zinc-950 border border-[#8b5a68] rounded-2xl p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-xs font-bold text-[#c9a0aa]">
                <span className="w-2 h-2 rounded-full bg-[#c9a0aa] animate-ping" />
                <span>LAB LECTURE IN SESSION</span>
                <span>•</span>
                <span className="text-white">{activeSession.subject_title}</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">
                {activeSession.lab_room} ({activeSession.batch})
              </h3>
            </div>

            <div className="flex items-center space-x-3">
              <div className="bg-black border border-[#4a2f38]/80 px-3.5 py-1.5 rounded-xl text-center">
                <span className="text-[10px] text-zinc-400 block uppercase font-bold">Room Passcode</span>
                <span className="text-base font-mono font-black text-[#c9a0aa]">
                  {activeSession.session_code}
                </span>
              </div>

              <button
                onClick={() => handleEndSession(activeSession.id)}
                className="flex items-center space-x-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 px-3 py-2 rounded-xl text-xs font-bold"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>End Lab</span>
              </button>
            </div>
          </div>

          {/* Students Live Radar */}
          <div className="mt-4 pt-3 border-t border-zinc-800">
            <div className="flex items-center justify-between mb-2 text-xs text-zinc-300 font-bold">
              <span className="flex items-center space-x-1.5">
                <Users className="w-4 h-4 text-[#c9a0aa]" />
                <span>Students Active in Lab ({telemetry.length})</span>
              </span>
              <button onClick={fetchData} className="text-[#c9a0aa] hover:underline flex items-center space-x-1 text-[11px]">
                <RotateCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            {telemetry.length === 0 ? (
              <p className="text-xs text-zinc-500 py-1">Waiting for students to connect with code {activeSession.session_code}...</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {telemetry.map(t => (
                  <div key={t.student_id} className="bg-black border border-zinc-800 p-2.5 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-white">{t.student_name}</span>
                      <span className="font-mono text-[10px] text-[#c9a0aa]">{t.student_personal_id}</span>
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Status: <span className="text-zinc-200">{t.status_label || 'Active'}</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 flex justify-between pt-1 border-t border-zinc-900">
                      <span>{t.keystrokes_count} keys</span>
                      <span>{t.run_count} runs</span>
                      <span className="text-[#c9a0aa] font-bold">{t.tests_passed}/{t.tests_total} tests</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Verification Queue */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-white uppercase tracking-wider">
          <span className="flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-[#c9a0aa]" />
            <span>Submissions Awaiting Verification ({pending.length})</span>
          </span>
          <span className="text-zinc-500">{verified.length} Already Verified</span>
        </div>

        {pending.length === 0 ? (
          <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-xl text-center text-xs text-zinc-500">
            All submitted practicals have been verified!
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map(sub => (
              <div
                key={sub.id}
                className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-zinc-700 transition-all"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white text-sm">{sub.student_name}</span>
                    <span className="font-mono text-xs text-[#c9a0aa] bg-black px-1.5 py-0.5 rounded border border-zinc-800">
                      {sub.student_personal_id}
                    </span>
                    <span className="text-xs text-zinc-500">• {sub.student_batch}</span>
                  </div>
                  <div className="text-xs text-zinc-300 mt-0.5">
                    <strong className="text-[#c9a0aa]">Exp {sub.exp_number}:</strong> {sub.practical_title} ({sub.subject_code})
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1">
                    Language: <strong className="text-zinc-200 uppercase">{sub.language}</strong> • Submitted: {new Date(sub.updated_at).toLocaleTimeString()}
                  </div>
                </div>

                <button
                  onClick={() => handleOpenReview(sub)}
                  className="bg-[#8b5a68] hover:bg-[#9d6878] text-white font-bold px-3.5 py-1.5 rounded-lg text-xs transition-all shadow-md flex items-center space-x-1"
                >
                  <span>Review & Sign</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewSub && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between bg-black">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#c9a0aa]">
                  Faculty Verification
                </span>
                <h3 className="text-sm font-bold text-white">
                  {reviewSub.student_name} ({reviewSub.student_personal_id}) — Exp {reviewSub.exp_number}
                </h3>
              </div>
              <button onClick={() => setReviewSub(null)} className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Proof */}
              <div className="bg-black border border-zinc-800 p-3 rounded-xl space-y-1 text-zinc-300">
                <span className="text-[10px] font-bold text-[#c9a0aa] uppercase block">Simultaneous Lab Proof:</span>
                <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                  <div>Room: <strong className="text-white">{reviewSub.simultaneous_proof?.lab_room || 'Lab 304'}</strong></div>
                  <div>Keystrokes: <strong className="text-white">{reviewSub.simultaneous_proof?.keystrokes || 600}</strong></div>
                  <div>Runs: <strong className="text-white">{reviewSub.simultaneous_proof?.run_count || 4}</strong></div>
                </div>
              </div>

              {/* Code */}
              <div>
                <label className="font-bold text-white block mb-1">Student's Code ({reviewSub.language.toUpperCase()}):</label>
                <pre className="bg-black border border-zinc-800 rounded-xl p-3 font-mono text-xs text-zinc-200 max-h-56 overflow-y-auto whitespace-pre-wrap select-text">
                  {reviewSub.code}
                </pre>
              </div>

              {/* Output */}
              {reviewSub.last_output && (
                <div>
                  <label className="font-bold text-white block mb-1">Terminal Output:</label>
                  <pre className="bg-black border border-zinc-800 rounded-xl p-2.5 font-mono text-[11px] text-[#d4b8be] whitespace-pre-wrap">
                    {reviewSub.last_output}
                  </pre>
                </div>
              )}

              {/* Marks & Remarks */}
              <div className="grid grid-cols-3 gap-3 bg-black p-3 rounded-xl border border-zinc-800">
                <div>
                  <label className="font-bold text-white block mb-1">Marks (Max {reviewSub.max_marks || 10}):</label>
                  <input
                    type="number"
                    min="0"
                    max={reviewSub.max_marks || 10}
                    step="0.5"
                    value={marks}
                    onChange={(e) => setMarks(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 font-mono text-sm font-bold text-[#c9a0aa] focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-bold text-white block mb-1">Remarks:</label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-zinc-800 bg-black flex items-center justify-between">
              <button
                onClick={() => handleVerify('reject')}
                disabled={isVerifying}
                className="px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 bg-zinc-900 rounded-xl font-bold"
              >
                Request Revision
              </button>
              <button
                onClick={() => handleVerify('approve')}
                disabled={isVerifying}
                className="flex items-center space-x-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#8b5a68] hover:bg-[#9d6878] rounded-xl shadow-md disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Approve & Sign Digitally</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start Session Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h3 className="text-sm font-bold text-white">Start New Lab Lecture</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleStartSession} className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-300 font-bold block mb-1">Subject Lab:</label>
                <select
                  value={newSub}
                  onChange={(e) => setNewSub(e.target.value)}
                  className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white"
                >
                  <option value="sub-1">CS501 - Data Structures & Algorithms Lab</option>
                  <option value="sub-2">CS502 - Database Management Systems Lab</option>
                  <option value="sub-3">CS503 - Operating Systems Lab</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-300 font-bold block mb-1">Lab Room Venue:</label>
                <input
                  type="text"
                  value={newRoom}
                  onChange={(e) => setNewRoom(e.target.value)}
                  className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-bold block mb-1">Batch:</label>
                <input
                  type="text"
                  value={newBatch}
                  onChange={(e) => setNewBatch(e.target.value)}
                  className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-1.5 bg-zinc-900 rounded-lg text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#8b5a68] hover:bg-[#9d6878] text-white font-bold rounded-lg shadow-md"
                >
                  Broadcast & Start Lab
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
