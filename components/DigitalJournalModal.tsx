'use client';

import React, { useState, useEffect } from 'react';
import { User } from '@/lib/types';
import {
  FileCheck2,
  Printer,
  X,
  ShieldCheck,
  Leaf,
  Layers
} from 'lucide-react';

interface DigitalJournalModalProps {
  currentUser: User;
  onClose: () => void;
}

export default function DigitalJournalModal({
  currentUser,
  onClose
}: DigitalJournalModalProps) {
  const [journalData, setJournalData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJournal = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/journal/${currentUser.id}`);
        const data = await res.json();
        setJournalData(data);
      } catch (err) {
        console.error('Failed to load journal:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchJournal();
  }, [currentUser.id]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Top Bar */}
        <div className="px-5 py-3 border-b border-zinc-800 bg-black flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <FileCheck2 className="w-5 h-5 text-[#c9a0aa]" />
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Official Digital Lab Journal
              </h3>
              <p className="text-[11px] text-zinc-400">
                Continuous Assessment Record • No Printing Needed
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.print()}
              className="flex items-center space-x-1.5 bg-[#8b5a68] hover:bg-[#9d6878] text-white font-bold px-3.5 py-1.5 rounded-lg text-xs shadow-md transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-black text-zinc-200 print:bg-white print:text-black print:p-0">
          {loading ? (
            <div className="text-center py-20 text-zinc-400 text-xs">
              Loading Official Digital Journal...
            </div>
          ) : !journalData ? (
            <div className="text-center py-20 text-zinc-400 text-xs">
              Failed to load journal.
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6 print:space-y-4">
              
              {/* Institution Header */}
              <div className="border border-zinc-800 print:border-black p-6 rounded-2xl text-center space-y-2 bg-zinc-950/60 print:bg-transparent">
                <div className="text-xs uppercase tracking-widest text-[#c9a0aa] print:text-black font-extrabold">
                  {journalData.institution?.college_name}
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white print:text-black uppercase">
                  {journalData.institution?.department}
                </h1>
                <p className="text-xs text-zinc-400 print:text-zinc-600">
                  {journalData.institution?.academic_year}
                </p>

                {/* Candidate Info Box */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 text-xs bg-black print:bg-zinc-100 p-3 rounded-xl border border-zinc-800 print:border-zinc-300 text-left">
                  <div>
                    <span className="text-[10px] text-zinc-400 print:text-zinc-600 uppercase block">Candidate Name</span>
                    <strong className="text-white print:text-black">{journalData.student?.name}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 print:text-zinc-600 uppercase block">Student Roll ID</span>
                    <strong className="text-[#c9a0aa] print:text-black font-mono">{journalData.student?.personal_id}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 print:text-zinc-600 uppercase block">Batch & Sem</span>
                    <strong className="text-white print:text-black">Sem {journalData.student?.semester} ({journalData.student?.batch})</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 print:text-zinc-600 uppercase block">Avg Score</span>
                    <strong className="text-[#c9a0aa] print:text-black font-mono">{journalData.summary?.average_marks} / 10</strong>
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-[#c9a0aa] print:text-zinc-700 font-bold flex items-center justify-center space-x-2">
                  <Leaf className="w-3.5 h-3.5" />
                  <span>{journalData.summary?.pages_saved} Pages of Paper Saved (₹{journalData.summary?.money_saved_inr} Saved)</span>
                </div>
              </div>

              {/* Index Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-white print:text-black uppercase tracking-wider flex items-center space-x-1.5">
                  <Layers className="w-4 h-4 text-[#c9a0aa]" />
                  <span>Continuous Assessment Index</span>
                </h3>

                <div className="overflow-x-auto rounded-xl border border-zinc-800 print:border-zinc-400">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-zinc-950 print:bg-zinc-200 text-zinc-300 print:text-black font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5 border-b border-zinc-800 print:border-zinc-300">Exp #</th>
                        <th className="p-2.5 border-b border-zinc-800 print:border-zinc-300">Title</th>
                        <th className="p-2.5 border-b border-zinc-800 print:border-zinc-300">Subject</th>
                        <th className="p-2.5 border-b border-zinc-800 print:border-zinc-300">Marks (10)</th>
                        <th className="p-2.5 border-b border-zinc-800 print:border-zinc-300">Faculty Digital Signature</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800 print:divide-zinc-300">
                      {journalData.practicals?.map((p: any) => (
                        <tr key={p.id}>
                          <td className="p-2.5 font-mono font-bold text-[#c9a0aa] print:text-black">{p.exp_number}</td>
                          <td className="p-2.5 font-medium text-white print:text-black">{p.practical_title}</td>
                          <td className="p-2.5 text-zinc-400 print:text-black">{p.subject_code}</td>
                          <td className="p-2.5 font-mono font-bold text-[#c9a0aa] print:text-black">{p.marks_obtained !== null ? p.marks_obtained : 10}</td>
                          <td className="p-2.5 text-[11px] text-[#d4b8be] print:text-black font-semibold truncate max-w-xs">
                            {p.teacher_signature || 'Verified Live'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Experiments */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-bold text-white print:text-black uppercase tracking-wider">
                  Verified Experiment Submissions
                </h3>

                {journalData.practicals?.map((p: any) => (
                  <div key={p.id} className="border border-zinc-800 print:border-zinc-400 rounded-xl p-4 bg-zinc-950 space-y-2.5 print:bg-transparent">
                    <div className="flex justify-between items-center border-b border-zinc-800 print:border-zinc-300 pb-1.5">
                      <span className="text-xs font-bold text-white print:text-black">
                        Exp {p.exp_number}: {p.practical_title}
                      </span>
                      <span className="text-xs font-mono font-bold text-[#c9a0aa] print:text-black">
                        Marks: {p.marks_obtained}/10
                      </span>
                    </div>

                    <div className="text-xs">
                      <strong className="text-zinc-500 uppercase block text-[10px]">Aim:</strong>
                      <p className="text-zinc-300 print:text-black mt-0.5">{p.aim}</p>
                    </div>

                    <div className="text-xs">
                      <strong className="text-zinc-500 uppercase block text-[10px]">Verified Code ({p.language?.toUpperCase()}):</strong>
                      <pre className="bg-black print:bg-zinc-100 border border-zinc-800 print:border-zinc-300 p-2.5 rounded-lg font-mono text-[11px] text-zinc-300 print:text-black whitespace-pre-wrap max-h-48 overflow-y-auto mt-0.5 select-text">
                        {p.code}
                      </pre>
                    </div>

                    {/* Teacher Stamp */}
                    <div className="bg-black print:bg-zinc-100 border border-zinc-800 print:border-zinc-300 p-2.5 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center space-x-1 text-[#c9a0aa] print:text-black font-bold text-[11px]">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>FACULTY SIGNATURE SEAL</span>
                        </div>
                        <p className="text-[11px] text-zinc-300 print:text-zinc-700 italic">
                          "{p.teacher_remarks || 'Verified live in lab lecture.'}"
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400 print:text-zinc-600">
                        Zero-Paper Certified
                      </span>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
