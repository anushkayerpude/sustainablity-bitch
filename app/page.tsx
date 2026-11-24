'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import StudentDashboard from '@/components/StudentDashboard';
import PracticalIDE from '@/components/PracticalIDE';
import AssignmentSection from '@/components/AssignmentSection';
import TeacherDashboard from '@/components/TeacherDashboard';
import DigitalJournalModal from '@/components/DigitalJournalModal';
import { User, Practical, LiveSession } from '@/lib/types';
import { Cpu } from 'lucide-react';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'practicals' | 'assignments' | 'journal' | 'teacher_cockpit'>('practicals');
  
  // Practicals state
  const [practicals, setPracticals] = useState<Practical[]>([]);
  const [activeSessions, setActiveSessions] = useState<LiveSession[]>([]);
  const [activePracticalId, setActivePracticalId] = useState<string | null>(null);
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load Auth / Users
  const loadUsersAndAuth = async (userIdToSelect?: string) => {
    try {
      const res = await fetch(`/api/auth${userIdToSelect ? `?userId=${userIdToSelect}` : ''}`);
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
      if (data.currentUser) {
        setCurrentUser(data.currentUser);
        // If teacher selected, set tab accordingly or let them view
        if (data.currentUser.role === 'teacher') {
          setActiveTab('teacher_cockpit');
        } else {
          setActiveTab('practicals');
        }
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  // Load Practicals for current student
  const loadPracticals = async (studentId?: string) => {
    const sId = studentId || currentUser?.id || 'student-1';
    try {
      setLoading(true);
      const res = await fetch(`/api/practicals?studentId=${sId}`);
      const data = await res.json();
      if (data.practicals) {
        setPracticals(data.practicals);
      }
      if (data.activeSessions) {
        setActiveSessions(data.activeSessions);
      }
    } catch (err) {
      console.error('Failed to load practicals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadUsersAndAuth();
      await loadPracticals();
    };
    init();
  }, []);

  // When user identity is switched from Navbar
  const handleSwitchUser = async (newUserId: string) => {
    const targetUser = users.find(u => u.id === newUserId);
    if (!targetUser) return;

    setCurrentUser(targetUser);
    setActivePracticalId(null);

    if (targetUser.role === 'teacher') {
      setActiveTab('teacher_cockpit');
    } else {
      setActiveTab('practicals');
      await loadPracticals(targetUser.id);
    }
  };

  // Calculate environmental and cost savings
  const completedCount = practicals.filter(p => p.submission_status === 'verified').length;
  const pagesSavedCount = completedCount * 14;

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-zinc-400 space-y-3">
        <Cpu className="w-10 h-10 text-fuchsia-500 animate-spin" />
        <p className="text-xs font-bold uppercase tracking-wider text-zinc-300">Loading LabSync...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col selection:bg-fuchsia-500 selection:text-white">
      
      {/* Main Top Header with Role Switcher & Eco Impact */}
      <Navbar
        currentUser={currentUser}
        users={users}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setActivePracticalId(null);
          if (tab === 'journal') {
            setIsJournalModalOpen(true);
          }
        }}
        onSwitchUser={handleSwitchUser}
        hasActiveLiveSession={activeSessions.length > 0}
        pagesSavedCount={pagesSavedCount}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* If an active practical is being performed in the IDE */}
        {activePracticalId ? (
          <PracticalIDE
            practicalId={activePracticalId}
            currentUser={currentUser}
            onBack={() => {
              setActivePracticalId(null);
              loadPracticals();
            }}
            onSubmittedSuccess={() => {
              loadPracticals();
            }}
          />
        ) : (
          <>
            {/* View 1: Student Practicals Dashboard (Pending / Current / Already Done) */}
            {activeTab === 'practicals' && (
              <StudentDashboard
                currentUser={currentUser}
                practicals={practicals}
                activeSessions={activeSessions}
                onOpenPractical={(pId) => setActivePracticalId(pId)}
                onOpenJournal={() => setIsJournalModalOpen(true)}
                onSwitchToAssignments={() => setActiveTab('assignments')}
              />
            )}

            {/* View 2: Assignments Section */}
            {activeTab === 'assignments' && (
              <AssignmentSection currentUser={currentUser} />
            )}

            {/* View 3: Teacher / Staff Live Cockpit & Verification Radar */}
            {activeTab === 'teacher_cockpit' && (
              <TeacherDashboard
                currentUser={currentUser}
                onRefreshPracticals={loadPracticals}
              />
            )}
          </>
        )}

      </main>

      {/* Digital Journal Modal */}
      {isJournalModalOpen && (
        <DigitalJournalModal
          currentUser={currentUser}
          onClose={() => setIsJournalModalOpen(false)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-black py-4 px-6 text-center text-xs text-zinc-500 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>LabSync • Continuous Assessment & Simultaneous Practical Verification</span>
          <span className="text-fuchsia-400 font-semibold">Zero Paper • Verified Live</span>
        </div>
      </footer>

    </div>
  );
}
