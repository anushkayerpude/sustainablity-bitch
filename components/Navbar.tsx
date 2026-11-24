'use client';

import React, { useState } from 'react';
import { User } from '@/lib/types';
import { 
  Terminal, 
  BookOpen, 
  FileCheck2, 
  Radio, 
  ChevronDown,
  Layers,
  Leaf,
  Users
} from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  users: User[];
  activeTab: 'practicals' | 'assignments' | 'journal' | 'teacher_cockpit';
  setActiveTab: (tab: 'practicals' | 'assignments' | 'journal' | 'teacher_cockpit') => void;
  onSwitchUser: (userId: string) => void;
  hasActiveLiveSession: boolean;
  pagesSavedCount: number;
}

export default function Navbar({
  currentUser,
  users,
  activeTab,
  setActiveTab,
  onSwitchUser,
  hasActiveLiveSession,
  pagesSavedCount
}: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-black border-b border-zinc-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Platform Name */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-[#8b5a68] flex items-center justify-center shadow-lg shadow-[#8b5a68]/30">
              <Terminal className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-lg tracking-tight text-white">
                  Lab<span className="text-[#9d6878]">Sync</span>
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#1a0d12] text-[#d4b8be] border border-[#3d1f28] px-1.5 py-0.5 rounded">
                  Digital Lab
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                No Paper • Live Verification
              </p>
            </div>
          </div>

          {/* Simple Main Navigation */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('practicals')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'practicals'
                  ? 'bg-[#8b5a68] text-white shadow-md shadow-[#8b5a68]/30'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Practicals</span>
              {hasActiveLiveSession && (
                <span className="w-2 h-2 rounded-full bg-[#d4b8be] animate-ping ml-1" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('assignments')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'assignments'
                  ? 'bg-[#8b5a68] text-white shadow-md shadow-[#8b5a68]/30'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Assignments</span>
            </button>

            <button
              onClick={() => setActiveTab('journal')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'journal'
                  ? 'bg-[#8b5a68] text-white shadow-md shadow-[#8b5a68]/30'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Digital Journal</span>
            </button>

            {currentUser?.role === 'teacher' && (
              <button
                onClick={() => setActiveTab('teacher_cockpit')}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                  activeTab === 'teacher_cockpit'
                    ? 'bg-[#8b5a68] text-white shadow-md shadow-[#8b5a68]/30 ring-2 ring-[#c9a0aa]'
                    : 'text-[#c9a0aa] hover:text-white hover:bg-zinc-900'
                }`}
              >
                <Radio className="w-4 h-4 animate-pulse text-[#c9a0aa]" />
                <span>Teacher Radar</span>
              </button>
            )}
          </nav>

          {/* Right Area: Roll No / User Switcher */}
          <div className="flex items-center space-x-3">
            
            {/* Sustainability Badge */}
            <div className="hidden lg:flex items-center space-x-1.5 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg text-xs text-zinc-300">
              <Leaf className="w-3.5 h-3.5 text-[#c9a0aa]" />
              <span>{pagesSavedCount} Pages Saved</span>
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-[#9d6878]/50 px-3 py-1.5 rounded-xl transition-all"
              >
                <span className="text-sm">{currentUser?.avatar || '👤'}</span>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <span>{currentUser?.name || 'User'}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-[#1a0d12] text-[#c9a0aa] border border-[#3d1f28]">
                      {currentUser?.personal_id}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400 capitalize">
                    {currentUser?.role === 'teacher' ? 'Faculty' : `Student • ${currentUser?.batch}`}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 ml-1" />
              </button>

              {/* Simple User Switcher Dropdown */}
              {dropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-72 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-2 z-50"
                  onClick={() => setDropdownOpen(false)}
                >
                  <div className="px-2 py-1 text-[11px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 mb-1">
                    Select Account (Student or Teacher)
                  </div>

                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {users.map(u => (
                      <button
                        key={u.id}
                        onClick={() => onSwitchUser(u.id)}
                        className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between text-xs transition-colors ${
                          currentUser?.id === u.id
                            ? 'bg-[#8b5a68] text-white font-bold'
                            : 'text-zinc-300 hover:bg-zinc-900'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-base">{u.avatar || '👤'}</span>
                          <div>
                            <div className="font-semibold">{u.name}</div>
                            <div className="text-[10px] opacity-75 font-mono">{u.personal_id}</div>
                          </div>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${
                          u.role === 'teacher' ? 'bg-zinc-800 text-[#d4b8be]' : 'bg-zinc-800 text-zinc-300'
                        }`}>
                          {u.role}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}
