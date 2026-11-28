import React, { useState } from 'react';
import {
  Users,
  CheckCircle2,
  X,
  Send,
  Building2,
  GraduationCap,
  Mail,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { ClubDiscoveryItem, CLUBS_DATA } from '../data/clubDiscoveryData';
import { ecosystemStore, EcosystemUser } from '../data/ecosystemStore';

interface StudentJoinClubModalProps {
  isOpen: boolean;
  onClose: () => void;
  club: ClubDiscoveryItem | null;
  currentUser: EcosystemUser | null;
}

export function StudentJoinClubModal({
  isOpen,
  onClose,
  club,
  currentUser,
}: StudentJoinClubModalProps) {
  const [selectedClubId, setSelectedClubId] = useState<string>(club?.clubId || CLUBS_DATA[0].clubId);
  const [studentName, setStudentName] = useState(currentUser?.name || '');
  const [studentEmail, setStudentEmail] = useState(currentUser?.email || '');
  const [major, setMajor] = useState(currentUser?.departmentOrMajor || '');
  const [interestReason, setInterestReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [errorNotice, setErrorNotice] = useState('');

  if (!isOpen) return null;

  const currentSelectedClub = CLUBS_DATA.find((c) => c.clubId === (club?.clubId || selectedClubId)) || CLUBS_DATA[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice('');

    if (!studentName.trim()) {
      setErrorNotice('Please enter your full name.');
      return;
    }
    if (!studentEmail.trim() || !studentEmail.includes('@')) {
      setErrorNotice('Please provide a valid institutional CUNY email.');
      return;
    }
    if (!major.trim()) {
      setErrorNotice('Please specify your academic program or major.');
      return;
    }

    ecosystemStore.submitJoinRequest({
      clubId: currentSelectedClub.clubId,
      clubName: currentSelectedClub.name,
      studentName: studentName.trim(),
      studentEmail: studentEmail.trim().toLowerCase(),
      major: major.trim(),
      interestReason: interestReason.trim() || 'Excited to participate in club meetings and community events.',
    });

    setSubmitted(true);
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    setInterestReason('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white relative">
          <button
            onClick={handleResetAndClose}
            className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300">Student &rarr; Club Application</span>
              <h3 className="text-lg font-bold">Request to Join {currentSelectedClub.name}</h3>
            </div>
          </div>
          <p className="text-xs text-blue-200">
            Submit your initial membership application. Your request will be directly routed to club executive officers and Student Life for verification.
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {submitted ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border-2 border-emerald-300 shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-slate-900">Application Submitted!</h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Your request to join <strong>{currentSelectedClub.name}</strong> has been placed into the club's in-app review queue. You will receive an email confirmation once reviewed by the club officers.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 text-left space-y-1">
                <div><strong>Applicant:</strong> {studentName} ({studentEmail})</div>
                <div><strong>Program:</strong> {major}</div>
                <div><strong>Status:</strong> <span className="text-amber-600 font-bold">Pending Club Review</span></div>
              </div>
              <button
                onClick={handleResetAndClose}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorNotice && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorNotice}</span>
                </div>
              )}

              {/* Club Selector if not pre-locked */}
              {!club && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Club:</label>
                  <select
                    value={selectedClubId}
                    onChange={(e) => setSelectedClubId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {CLUBS_DATA.map((c) => (
                      <option key={c.clubId} value={c.clubId}>
                        {c.name} ({c.category})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Applicant Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Alex Rivera"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              {/* CUNY Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">CUNY Institutional Email:</label>
                <input
                  type="email"
                  placeholder="student@spsmail.cuny.edu"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Use your @spsmail.cuny.edu or @sps.cuny.edu address</span>
              </div>

              {/* Major */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Degree Program / Major:</label>
                <input
                  type="text"
                  placeholder="e.g. B.S. in Information Systems, M.S. in Data Science"
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              {/* Statement of Interest */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Why do you want to join? (Optional):</label>
                <textarea
                  rows={2}
                  placeholder="Tell the officers a little about your interests, goals, or what events you want to see..."
                  value={interestReason}
                  onChange={(e) => setInterestReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Membership Request</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
