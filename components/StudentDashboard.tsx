'use client';

import React, { useState } from 'react';
import { Practical, User, LiveSession } from '@/lib/types';
import { 
  Play, 
  Clock, 
  CheckCircle2, 
  Radio, 
  ShieldCheck, 
  Search, 
  ChevronRight,
  BookMarked,
  Printer,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface StudentDashboardProps {
  currentUser: User;
  practicals: Practical[];
  activeSessions: LiveSession[];
  onOpenPractical: (practicalId: string) => void;
  onOpenJournal: () => void;
  onSwitchToAssignments: () => void;
}

export default function StudentDashboard({
  currentUser,
  practicals,
  activeSessions,
  onOpenPractical,
  onOpenJournal,
  onSwitchToAssignments
}: StudentDashboardProps) {
  const [selectedSection, setSelectedSection] = useState<'current' | 'pending' | 'completed'>('current');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Current: Active live lab or draft in-progress
  const currentPracticals = practicals.filter(p => {
    return p.has_active_session || p.submission_status === 'in_progress' || p.submission_status === 'draft';
  });

  // 2. Pending: Not started or needs revision
  const pendingPracticals = practicals.filter(p => {
    return (!p.has_active_session && (p.submission_status === 'not_started' || !p.submission_status)) || p.submission_status === 'rejected';
  });

  // 3. Completed: Verified or submitted
  const completedPracticals = practicals.filter(p => {
    return p.submission_status === 'verified' || p.submission_status === 'submitted';
  });

  // Current list based on tab
  const getDisplayedList = () => {
    let list: Practical[] = [];
    if (selectedSection === 'current') list = currentPracticals;
    else if (selectedSection === 'pending') list = pendingPracticals;
    else if (selectedSection === 'completed') list = completedPracticals;

    if (!searchQuery.trim()) return list;

    return list.filter(p => 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.aim.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.subject_title && p.subject_title.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  const displayedList = getDisplayedList();

  return (
    <div className="space-y-6">

      {/* Clean Black & Magenta Header Card */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-fuchsia-400 uppercase tracking-wider mb-1">
              <span>Engineering Lab Portal</span>
              <span>•</span>
              <span className="font-mono bg-fuchsia-950 px-2 py-0.5 rounded border border-fuchsia-800">
                Roll No: {currentUser.personal_id}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Welcome back, {currentUser.name}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
              Perform practicals live during lab lectures. Everything is verified and stored under your Student ID. No printed manuals needed!
            </p>
          </div>

          {/* Simple Stat Cards */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setSelectedSection('current')}
              className={`p-3 rounded-xl border text-center transition-all ${
                selectedSection === 'current'
                  ? 'bg-fuchsia-950/60 border-fuchsia-500 text-white'
                  : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300'
              }`}
            >
              <div className="text-[11px] font-bold uppercase text-zinc-400">Current</div>
              <div className="text-2xl font-black text-fuchsia-400 mt-0.5">{currentPracticals.length}</div>
              <div className="text-[10px] text-zinc-500">Live / Active</div>
            </button>

            <button
              onClick={() => setSelectedSection('pending')}
              className={`p-3 rounded-xl border text-center transition-all ${
                selectedSection === 'pending'
                  ? 'bg-fuchsia-950/60 border-fuchsia-500 text-white'
                  : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300'
              }`}
            >
              <div className="text-[11px] font-bold uppercase text-zinc-400">Pending</div>
              <div className="text-2xl font-black text-white mt-0.5">{pendingPracticals.length}</div>
              <div className="text-[10px] text-zinc-500">To Perform</div>
            </button>

            <button
              onClick={() => setSelectedSection('completed')}
              className={`p-3 rounded-xl border text-center transition-all ${
                selectedSection === 'completed'
                  ? 'bg-fuchsia-950/60 border-fuchsia-500 text-white'
                  : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300'
              }`}
            >
              <div className="text-[11px] font-bold uppercase text-zinc-400">Done</div>
              <div className="text-2xl font-black text-fuchsia-400 mt-0.5">{completedPracticals.length}</div>
              <div className="text-[10px] text-zinc-500">Checked</div>
            </button>
          </div>
        </div>

        {/* Live Lab Alert Banner (If Lab is happening right now!) */}
        {activeSessions.length > 0 && (
          <div className="mt-5 bg-fuchsia-950/80 border border-fuchsia-600 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-fuchsia-500"></span>
              </span>
              <div>
                <span className="font-extrabold text-fuchsia-400 uppercase tracking-wide">
                  Live Lab Happening Now:
                </span>
                <span className="font-bold text-white ml-1.5">
                  {activeSessions[0].subject_title}
                </span>
                <span className="text-zinc-300 ml-1">in {activeSessions[0].lab_room}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="font-mono bg-black text-fuchsia-300 px-2 py-1 rounded border border-fuchsia-800 font-bold">
                Code: {activeSessions[0].session_code}
              </span>
              {activeSessions[0].active_practical_id && (
                <button
                  onClick={() => onOpenPractical(activeSessions[0].active_practical_id)}
                  className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-extrabold px-3 py-1 rounded-lg transition-all shadow-md flex items-center space-x-1"
                >
                  <Play className="w-3 h-3 fill-white" />
                  <span>Open Practical</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3 Simple Tabs (Very Easy to Understand) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-3">
        <div className="flex items-center space-x-2">
          
          {/* Tab 1: Current */}
          <button
            onClick={() => setSelectedSection('current')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
              selectedSection === 'current'
                ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/30'
                : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
            }`}
          >
            <Radio className="w-4 h-4 text-white" />
            <span>1. Current Practicals</span>
            <span className="bg-black/40 text-white text-xs px-1.5 py-0.2 rounded-full font-mono">
              {currentPracticals.length}
            </span>
          </button>

          {/* Tab 2: Pending */}
          <button
            onClick={() => setSelectedSection('pending')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
              selectedSection === 'pending'
                ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/30'
                : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>2. Pending Practicals</span>
            <span className="bg-black/40 text-white text-xs px-1.5 py-0.2 rounded-full font-mono">
              {pendingPracticals.length}
            </span>
          </button>

          {/* Tab 3: Completed */}
          <button
            onClick={() => setSelectedSection('completed')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
              selectedSection === 'completed'
                ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/30'
                : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>3. Already Done</span>
            <span className="bg-black/40 text-white text-xs px-1.5 py-0.2 rounded-full font-mono">
              {completedPracticals.length}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search practicals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-xs text-white pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-fuchsia-500 w-full sm:w-60"
          />
        </div>
      </div>

      {/* Practical Cards List */}
      {displayedList.length === 0 ? (
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-400">
          <BookMarked className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
          <h3 className="text-base font-bold text-white">No practicals found here</h3>
          <p className="text-xs text-zinc-500 mt-1">
            {selectedSection === 'current'
              ? 'No live lab lecture running right now. Click "Pending Practicals" to see what you need to do.'
              : selectedSection === 'pending'
              ? 'All assigned practicals are completed!'
              : 'You haven\'t completed any practicals yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedList.map(practical => {
            const isLive = practical.has_active_session;
            const isVerified = practical.submission_status === 'verified';
            const isSubmitted = practical.submission_status === 'submitted';

            return (
              <div
                key={practical.id}
                className={`bg-zinc-950 border rounded-2xl p-5 flex flex-col justify-between transition-all hover:border-fuchsia-500/70 shadow-lg ${
                  isLive
                    ? 'border-fuchsia-500 ring-1 ring-fuchsia-500/40 bg-zinc-950'
                    : isVerified
                    ? 'border-zinc-800 hover:border-zinc-700'
                    : 'border-zinc-800'
                }`}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-fuchsia-400">
                      EXP {practical.exp_number} • {practical.subject_code}
                    </span>

                    {isLive && (
                      <span className="bg-fuchsia-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full animate-pulse">
                        ● LIVE IN LAB
                      </span>
                    )}

                    {isVerified && (
                      <span className="bg-zinc-900 border border-fuchsia-700 text-fuchsia-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <ShieldCheck className="w-3 h-3 text-fuchsia-400" />
                        <span>Verified & Checked</span>
                      </span>
                    )}

                    {isSubmitted && !isVerified && (
                      <span className="bg-zinc-900 text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Submitted (Waiting Sign)
                      </span>
                    )}
                  </div>

                  {/* Title & Aim */}
                  <h3 className="text-base font-bold text-white leading-snug">
                    {practical.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                    {practical.aim}
                  </p>

                  {/* Languages supported */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase">Languages:</span>
                    {practical.supported_languages.map(lang => (
                      <span key={lang} className="text-[10px] font-mono font-bold bg-zinc-900 text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-800">
                        {lang.toUpperCase()}
                      </span>
                    ))}
                    <span className="text-[10px] text-zinc-400 ml-auto font-medium">
                      Max: {practical.max_marks} Marks
                    </span>
                  </div>

                  {/* Teacher marks & signature if verified */}
                  {isVerified && (
                    <div className="mt-3.5 bg-black border border-zinc-800 rounded-xl p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between text-white font-bold">
                        <span>Marks: <strong className="text-fuchsia-400">{practical.marks_obtained !== null ? practical.marks_obtained : 10}/{practical.max_marks}</strong></span>
                        <span className="text-[10px] font-mono text-zinc-400">No Printing Required ✓</span>
                      </div>
                      {practical.teacher_remarks && (
                        <p className="text-[11px] text-zinc-300 italic">
                          "{practical.teacher_remarks}"
                        </p>
                      )}
                      <div className="text-[10px] text-fuchsia-400 font-medium pt-0.5">
                        Signed: {practical.teacher_signature || 'Faculty In-Charge'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Action Button */}
                <div className="mt-4 pt-3 border-t border-zinc-900 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500">
                    {practical.subject_title}
                  </span>

                  <button
                    onClick={() => onOpenPractical(practical.id)}
                    className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                      isLive
                        ? 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-fuchsia-600/30 ring-2 ring-fuchsia-400'
                        : isVerified
                        ? 'bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700'
                        : 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white'
                    }`}
                  >
                    <span>{isLive ? 'Perform Now' : isVerified ? 'View Solution' : 'Start Practical'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Simple Zero-Paper Footer Guarantee */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-fuchsia-400">
            <Printer className="w-5 h-5 text-fuchsia-400" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Save money on printing journals</h4>
            <p className="text-[11px] text-zinc-400">
              All experiments are digitally stored under your Student ID with faculty signatures.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenJournal}
          className="bg-zinc-900 hover:bg-zinc-800 border border-fuchsia-500/60 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all shadow-md flex items-center space-x-1.5 shrink-0 self-start sm:self-auto"
        >
          <span>Open Digital Journal</span>
          <ChevronRight className="w-3.5 h-3.5 text-fuchsia-400" />
        </button>
      </div>

    </div>
  );
}
