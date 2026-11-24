'use client';

import React, { useState, useEffect } from 'react';
import { Assignment, User } from '@/lib/types';
import {
  BookOpen,
  Calendar,
  Award,
  Clock,
  Code2,
  Send,
  Play,
  FileText,
  X,
  Search,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AssignmentSectionProps {
  currentUser: User;
}

export default function AssignmentSection({ currentUser }: AssignmentSectionProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'submitted' | 'graded' | 'all'>('all');
  const [search, setSearch] = useState('');

  // Active assignment modal
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
  const [submissionCode, setSubmissionCode] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('cpp');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testOutput, setTestOutput] = useState<string | null>(null);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/assignments?studentId=${currentUser.id}`);
      const data = await res.json();
      if (data.assignments) {
        setAssignments(data.assignments);
      }
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [currentUser.id]);

  const openSolver = (assign: Assignment) => {
    setActiveAssignment(assign);
    setSelectedLanguage(assign.supported_languages[0] || 'cpp');
    setSubmissionCode((assign as any).submitted_code || assign.starter_code || '');
    setSubmissionNotes((assign as any).submitted_notes || '');
    setTestOutput(null);
  };

  const handleSubmit = async () => {
    if (!activeAssignment) return;
    if (!submissionCode.trim() && !submissionNotes.trim()) {
      alert('Please provide code or solution notes.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment_id: activeAssignment.id,
          student_id: currentUser.id,
          code: submissionCode,
          notes: submissionNotes
        })
      });

      const data = await res.json();
      if (data.success) {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        alert('Assignment submitted successfully!');
        setActiveAssignment(null);
        fetchAssignments();
      } else {
        alert(data.error || 'Submission failed');
      }
    } catch (err: any) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestRun = async () => {
    if (!submissionCode.trim()) return;
    setTestOutput('Running code...\n');
    try {
      const res = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: selectedLanguage,
          code: submissionCode,
          testCases: activeAssignment?.test_cases || []
        })
      });
      const data = await res.json();
      if (data.execution?.stdout) {
        setTestOutput(data.execution.stdout);
      } else if (data.execution?.stderr) {
        setTestOutput(`Error:\n${data.execution.stderr}`);
      } else {
        setTestOutput('Executed successfully.');
      }
    } catch (err: any) {
      setTestOutput(`Runner error: ${err.message}`);
    }
  };

  const pendingCount = assignments.filter(a => a.submission_status === 'pending').length;
  const submittedCount = assignments.filter(a => a.submission_status === 'submitted').length;
  const gradedCount = assignments.filter(a => a.submission_status === 'graded').length;

  const filtered = assignments.filter(a => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'pending' && a.submission_status === 'pending') ||
      (filter === 'submitted' && a.submission_status === 'submitted') ||
      (filter === 'graded' && a.submission_status === 'graded');

    const matchesSearch =
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-fuchsia-400 text-xs font-bold uppercase tracking-wider mb-1">
            <BookOpen className="w-4 h-4" />
            <span>Assignments & Homework</span>
          </div>
          <h2 className="text-2xl font-black text-white">
            Engineering Coursework
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-lg">
            Solve problems, submit theory or code, and get graded online under Student ID: <span className="text-fuchsia-400 font-mono font-bold">{currentUser.personal_id}</span>.
          </p>
        </div>

        {/* Counts */}
        <div className="flex items-center space-x-2">
          <div className="bg-black border border-zinc-800 p-3 rounded-xl text-center min-w-[75px]">
            <div className="text-[10px] text-zinc-400 uppercase font-bold">To Do</div>
            <div className="text-xl font-black text-white mt-0.5">{pendingCount}</div>
          </div>
          <div className="bg-black border border-zinc-800 p-3 rounded-xl text-center min-w-[75px]">
            <div className="text-[10px] text-zinc-400 uppercase font-bold">Submitted</div>
            <div className="text-xl font-black text-zinc-300 mt-0.5">{submittedCount}</div>
          </div>
          <div className="bg-black border border-zinc-800 p-3 rounded-xl text-center min-w-[75px]">
            <div className="text-[10px] text-zinc-400 uppercase font-bold">Graded</div>
            <div className="text-xl font-black text-fuchsia-400 mt-0.5">{gradedCount}</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'all'
                ? 'bg-fuchsia-600 text-white shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            All ({assignments.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'pending'
                ? 'bg-fuchsia-600 text-white shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('submitted')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'submitted'
                ? 'bg-fuchsia-600 text-white shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            Submitted ({submittedCount})
          </button>
          <button
            onClick={() => setFilter('graded')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'graded'
                ? 'bg-fuchsia-600 text-white shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            Graded ({gradedCount})
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search assignments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-xs text-white pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-fuchsia-500 w-full sm:w-60"
          />
        </div>
      </div>

      {/* Cards Grid */}
      {filtered.length === 0 ? (
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500 text-xs">
          No assignments found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(assign => {
            const isGraded = assign.submission_status === 'graded';
            const isSub = assign.submission_status === 'submitted';

            return (
              <div
                key={assign.id}
                className={`bg-zinc-950 border rounded-2xl p-5 flex flex-col justify-between transition-all hover:border-fuchsia-500/70 ${
                  isGraded ? 'border-zinc-800' : isSub ? 'border-zinc-800' : 'border-zinc-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold text-fuchsia-400 uppercase">
                      {assign.subject_code} • {assign.category}
                    </span>

                    {isGraded ? (
                      <span className="bg-zinc-900 border border-fuchsia-700 text-fuchsia-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <Award className="w-3 h-3 text-fuchsia-400" />
                        <span>Graded: {(assign as any).marks_obtained}/{assign.max_marks}</span>
                      </span>
                    ) : isSub ? (
                      <span className="bg-zinc-900 text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Submitted
                      </span>
                    ) : (
                      <span className="bg-zinc-900 text-zinc-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Pending
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white leading-snug">
                    {assign.title}
                  </h3>

                  <p className="text-xs text-zinc-400 mt-1 line-clamp-3 leading-relaxed">
                    {assign.description}
                  </p>

                  {/* Feedback if graded */}
                  {isGraded && (assign as any).teacher_feedback && (
                    <div className="mt-3 bg-black border border-zinc-800 rounded-xl p-2.5 text-xs">
                      <span className="text-[10px] uppercase font-bold text-fuchsia-400 block">Teacher Feedback:</span>
                      <p className="text-[11px] text-zinc-300 italic mt-0.5">
                        "{(assign as any).teacher_feedback}"
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-900 flex items-center justify-between">
                  <div className="text-[11px] text-zinc-500 flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>Due: {new Date(assign.due_date).toLocaleDateString()}</span>
                  </div>

                  <button
                    onClick={() => openSolver(assign)}
                    className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-fuchsia-600 hover:bg-fuchsia-500 text-white transition-all shadow-md"
                  >
                    <span>{isGraded ? 'View Submission' : isSub ? 'Edit Solution' : 'Solve & Submit'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {activeAssignment && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between bg-black">
              <div>
                <span className="text-[10px] font-bold uppercase text-fuchsia-400">
                  {activeAssignment.subject_code}
                </span>
                <h3 className="text-sm font-bold text-white">
                  {activeAssignment.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveAssignment(null)}
                className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div className="bg-black border border-zinc-800 p-3 rounded-xl text-zinc-300 leading-relaxed">
                <span className="font-bold text-white block mb-1">Task Description:</span>
                {activeAssignment.description}
              </div>

              {/* Code */}
              {(activeAssignment.supported_languages.includes('cpp') || activeAssignment.supported_languages.includes('python')) && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-white flex items-center space-x-1">
                      <Code2 className="w-3.5 h-3.5 text-fuchsia-400" />
                      <span>Code Solution:</span>
                    </label>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="bg-black border border-zinc-800 text-xs text-white px-2 py-1 rounded"
                    >
                      {activeAssignment.supported_languages.map(l => (
                        <option key={l} value={l}>{l.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    rows={10}
                    value={submissionCode}
                    onChange={(e) => setSubmissionCode(e.target.value)}
                    placeholder="// Write solution here..."
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 font-mono text-xs text-white focus:outline-none focus:border-fuchsia-500"
                  />
                  <button
                    type="button"
                    onClick={handleTestRun}
                    className="text-xs font-bold text-fuchsia-400 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800 flex items-center space-x-1"
                  >
                    <Play className="w-3 h-3 fill-fuchsia-400" />
                    <span>Test Run Code</span>
                  </button>

                  {testOutput && (
                    <div className="bg-black p-2.5 rounded-xl border border-zinc-800 font-mono text-[11px] text-zinc-300 whitespace-pre-wrap">
                      {testOutput}
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1">
                <label className="font-bold text-white flex items-center space-x-1">
                  <FileText className="w-3.5 h-3.5 text-fuchsia-400" />
                  <span>Notes / Explanations:</span>
                </label>
                <textarea
                  rows={4}
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  placeholder="Explain your approach..."
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-fuchsia-500"
                />
              </div>
            </div>

            <div className="px-5 py-3 border-t border-zinc-800 bg-black flex items-center justify-between">
              <span className="text-[11px] text-zinc-500 font-mono">
                Student ID: {currentUser.personal_id}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveAssignment(null)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-900 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center space-x-1 px-4 py-1.5 text-xs font-bold text-white bg-fuchsia-600 hover:bg-fuchsia-500 rounded-xl shadow-md disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
