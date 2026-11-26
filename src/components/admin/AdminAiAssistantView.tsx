import React, { useState } from 'react';
import { ExternalLink, Globe, Mic, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { GroundingSource } from '../../types';
import { AudioRecorderButton } from '../AudioRecorderButton';
import { GeminiChatPanel } from '../GeminiChatPanel';

export function AdminAiAssistantView() {
  const { apiFetch } = useAuth();
  const [activeTab, setActiveTab] = useState<'chat' | 'search' | 'transcribe'>('chat');
  const [searchQuery, setSearchQuery] = useState(
    'Higher education student organization social media accessibility guidelines WCAG 2.2'
  );
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchResult, setSearchResult] = useState<{
    answer: string;
    sources: GroundingSource[];
    modelUsed: string;
  } | null>(null);
  const [transcript, setTranscript] = useState('');
  const [transcribeError, setTranscribeError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError('');
    try {
      const res = await apiFetch<typeof searchResult>('/api/ai/search', {
        method: 'POST',
        body: JSON.stringify({ query: searchQuery }),
      });
      setSearchResult(res);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Google Search grounded query failed.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Student Life AI Assistant</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Institutional Gemini assistant with multi-turn chat, Google Search grounded policy/trend
          research, and meeting audio transcription.
        </p>
      </div>

      <div className="bg-slate-100 border border-slate-200 rounded-lg p-4 flex items-start gap-3 text-xs text-slate-700">
        <ShieldCheck className="w-4 h-4 text-[#004B87] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-900">Institutional AI Guardrail:</span> All AI
          outputs are advisory and auditable. Never input confidential student PII or credential
          tokens into AI prompts.
        </div>
      </div>

      <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit overflow-x-auto">
        {[
          { id: 'chat' as const, label: 'Gemini Chatbot' },
          { id: 'search' as const, label: 'Google Search Research' },
          { id: 'transcribe' as const, label: 'Audio Transcription' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'chat' && <GeminiChatPanel />}

      {activeTab === 'search' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
          <form onSubmit={handleSearch} className="space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#004B87]" />
              <h2 className="text-sm font-semibold text-slate-900">
                Google Search Grounded Research (gemini-4-hydrogen)
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Query current platform policy updates, accessibility standards, or campus engagement
              benchmarks backed by verifiable Google Search links.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter a research topic..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className="px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md whitespace-nowrap cursor-pointer"
              >
                {searching ? 'Searching...' : 'Search with Google'}
              </button>
            </div>
          </form>

          {searchError && (
            <div role="alert" className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">
              {searchError}
            </div>
          )}

          {searchResult && (
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                {searchResult.answer}
              </div>
              {searchResult.sources.length > 0 && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-2">
                  <div className="text-xs font-semibold text-slate-800">
                    Cited Web Sources ({searchResult.sources.length})
                  </div>
                  <ul className="space-y-1.5">
                    {searchResult.sources.map((src, idx) => (
                      <li key={idx}>
                        <a
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-[#004B87] hover:underline break-all"
                        >
                          <span>{src.title}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'transcribe' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-[#004B87]" />
            <h2 className="text-sm font-semibold text-slate-900">
              Voice & Meeting Audio Transcription (gemini-3.5-transcribe)
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Record a quick briefing note or upload an audio clip to transcribe governance notes or
            announcement drafts.
          </p>
          <AudioRecorderButton
            allowUpload
            contextHint="CUNY SPS Office of Student Life briefing note"
            onTranscript={(txt) => setTranscript((prev) => (prev ? `${prev}\n\n${txt}` : txt))}
            onError={setTranscribeError}
          />
          {transcribeError && (
            <div role="alert" className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">
              {transcribeError}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Editable Transcript Output
            </label>
            <textarea
              rows={6}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Transcribed audio text will appear here..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
