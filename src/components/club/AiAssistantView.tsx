import { userFacingAiError } from '../../utils/userFacingError';
import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Globe,
  Mic,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { Club, GroundingSource, RoleName } from '../../types';
import { AudioRecorderButton } from '../AudioRecorderButton';
import { GeminiChatPanel } from '../GeminiChatPanel';

interface AiAssistantViewProps {
  club: Club;
  effectiveRole: RoleName | null;
  onSendDraftToStudio: () => void;
}

type AiTab =
  | 'chat'
  | 'search'
  | 'transcribe'
  | 'captions'
  | 'adapt'
  | 'ideas'
  | 'accessibility';

export function AiAssistantView({
  club,
  effectiveRole,
  onSendDraftToStudio,
}: AiAssistantViewProps) {
  const { apiFetch, setDraftHandoff } = useAuth();
  const [activeTab, setActiveTab] = useState<AiTab>('chat');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Google Search Grounding state
  const [searchQuery, setSearchQuery] = useState(
    'Current higher education student engagement trends on LinkedIn and Instagram'
  );
  const [searchResult, setSearchResult] = useState<{
    answer: string;
    sources: GroundingSource[];
    modelUsed: string;
  } | null>(null);

  // Audio Transcription state
  const [transcriptText, setTranscriptText] = useState('');

  // AI-001 Caption state
  const [eventName, setEventName] = useState('Spring AI & Civic Tech Showcase');
  const [date, setDate] = useState('2026-12-03');
  const [time, setTime] = useState('6:30 PM ET');
  const [description, setDescription] = useState(
    'Student project demonstrations, Q&A with faculty advisors, and spring officer recruitment.'
  );
  const [targetAudience, setTargetAudience] = useState('CUNY SPS undergraduate and graduate students');
  const [platform, setPlatform] = useState('Instagram Professional');
  const [tone, setTone] = useState('Welcoming, clear, and academic');
  const [captionResult, setCaptionResult] = useState<{
    caption: string;
    hashtags: string[];
    callToAction: string;
    accessibilityNote: string;
    modelUsed: string;
  } | null>(null);

  // AI-002 Adaptation state
  const [baseCaption, setBaseCaption] = useState(
    'Join the Artificial Intelligence Club on Dec 3 at 6:30 PM ET for our semester project showcase and spring planning session!'
  );
  const [adaptResult, setAdaptResult] = useState<{
    facebookPages: string;
    instagramProfessional: string;
    linkedin: string;
    adaptationRationale: string;
  } | null>(null);

  // AI-004 Ideas state
  const [ideasResult, setIdeasResult] = useState<
    { title: string; format: string; platform: string; hook: string; summary: string }[]
  >([]);

  // AI-005 Accessibility state
  const [a11yCaption, setA11yCaption] = useState('');
  const [visualDescription, setVisualDescription] = useState(
    'Event flyer showing Artificial Intelligence Club Meeting, CUNY SPS Student Life on Zoom.'
  );
  const [a11yResult, setA11yResult] = useState<{
    altTextSuggestion: string;
    readabilityScoreLabel: string;
    recommendations: string[];
  } | null>(null);

  const canUseAi = effectiveRole !== 'VIEWER';

  const handleSearchResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<typeof searchResult>('/api/ai/search', {
        method: 'POST',
        body: JSON.stringify({ clubId: club.clubId, query: searchQuery }),
      });
      setSearchResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google Search grounded query failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCaption = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<typeof captionResult>(`/api/clubs/${club.clubId}/ai/captions`, {
        method: 'POST',
        body: JSON.stringify({
          eventName,
          date,
          time,
          description,
          targetAudience,
          platform,
          tone,
        }),
      });
      setCaptionResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Caption generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdapt = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<typeof adaptResult>(`/api/clubs/${club.clubId}/ai/adapt`, {
        method: 'POST',
        body: JSON.stringify({ baseCaption, eventContext: eventName }),
      });
      setAdaptResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cross-platform adaptation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleIdeas = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<{ ideas: typeof ideasResult }>(`/api/clubs/${club.clubId}/ai/ideas`, {
        method: 'POST',
      });
      setIdeasResult(res.ideas ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Idea generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccessibility = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<typeof a11yResult>(`/api/clubs/${club.clubId}/ai/accessibility`, {
        method: 'POST',
        body: JSON.stringify({
          caption: a11yCaption || baseCaption,
          visualDescription,
        }),
      });
      setA11yResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Accessibility check failed.');
    } finally {
      setLoading(false);
    }
  };

  const sendCaptionToStudio = () => {
    if (!captionResult) return;
    setDraftHandoff({
      title: eventName,
      caption: captionResult.caption,
      hashtags: captionResult.hashtags,
      callToAction: captionResult.callToAction,
      relatedEvent: eventName,
      eventDate: date,
      aiAssisted: true,
    });
    onSendDraftToStudio();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">AI Content Assistant</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Multi-turn Gemini chatbot, Google Search grounded research, audio transcription,
          drafting, cross-platform adaptation, and WCAG accessibility support (Module 8 & Section B7).
        </p>
      </div>

      {/* Mandatory AI Governance Guardrail Banner */}
      <div className="bg-slate-100 border border-slate-200 rounded-lg p-4 flex items-start gap-3 text-xs text-slate-700">
        <ShieldCheck className="w-4 h-4 text-[#004B87] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-900">AI Governance Policy (Section B7):</span>{' '}
          AI-generated content is never automatically published. All outputs are returned as editable
          drafts requiring human officer verification, and confidential institutional records must not
          be submitted in prompts.
        </div>
      </div>

      <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-full lg:w-fit overflow-x-auto">
        {[
          { id: 'chat' as const, label: 'Gemini Chatbot' },
          { id: 'search' as const, label: 'Google Search Research' },
          { id: 'transcribe' as const, label: 'Audio Transcription' },
          { id: 'captions' as const, label: 'Caption Generator' },
          { id: 'adapt' as const, label: 'Cross-Platform' },
          { id: 'ideas' as const, label: 'Content Ideas' },
          { id: 'accessibility' as const, label: 'Accessibility & Alt-Text' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setError('');
              setActiveTab(tab.id);
            }}
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

      {error && (
        <div role="alert" className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">
          {userFacingAiError(error)}
        </div>
      )}

      {!canUseAi ? (
        <div className="p-6 bg-white border border-slate-200 rounded-lg text-sm text-slate-600">
          Viewer role does not include AI draft generation privileges.
        </div>
      ) : (
        <>
          {activeTab === 'chat' && (
            <GeminiChatPanel
              club={club}
              effectiveRole={effectiveRole}
              onSendReplyToStudio={(replyText) => {
                setDraftHandoff({
                  title: `${club.shortCode} AI Chat Draft`,
                  caption: replyText,
                  hashtags: ['#CUNYSPS', `#${club.shortCode.replace(/[^A-Z0-9]/gi, '')}`],
                  aiAssisted: true,
                });
                onSendDraftToStudio();
              }}
            />
          )}

          {activeTab === 'search' && (
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
              <form onSubmit={handleSearchResearch} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#004B87]" />
                  <h2 className="text-sm font-semibold text-slate-900">
                    Google Search Grounded Research (gemini-4-hydrogen)
                  </h2>
                </div>
                <p className="text-xs text-slate-500">
                  Pull real-time web facts, higher-education trends, or platform best practices
                  with clickable Google Search source citations.
                </p>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Ask a question backed by live Google Search..."
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md whitespace-nowrap cursor-pointer"
                  >
                    {loading ? 'Searching...' : 'Search with Google'}
                  </button>
                </div>
              </form>

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
                        {searchResult.sources.map((src, i) => (
                          <li key={i}>
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
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setDraftHandoff({
                          title: `${club.shortCode} Research Post`,
                          caption: searchResult.answer,
                          hashtags: ['#CUNYSPS', `#${club.shortCode.replace(/[^A-Z0-9]/gi, '')}`],
                          aiAssisted: true,
                        });
                        onSendDraftToStudio();
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md cursor-pointer"
                    >
                      <span>Send Findings to Content Studio</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'transcribe' && (
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-[#004B87]" />
                <h2 className="text-sm font-semibold text-slate-900">
                  Voice & Audio Transcription (gemini-3.5-transcribe)
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Record directly from your microphone or upload a pre-recorded voice memo to
                convert spoken club updates into editable social copy.
              </p>

              <AudioRecorderButton
                clubId={club.clubId}
                allowUpload
                contextHint={`Student organization announcement for ${club.name}`}
                onTranscript={(txt) =>
                  setTranscriptText((prev) => (prev ? `${prev}\n\n${txt}` : txt))
                }
                onError={setError}
              />

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Editable Transcript
                </label>
                <textarea
                  rows={6}
                  value={transcriptText}
                  onChange={(e) => setTranscriptText(e.target.value)}
                  placeholder="Record or upload audio to generate a clean transcript..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                />
              </div>

              {transcriptText.trim() && (
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setTranscriptText('')}
                    className="px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftHandoff({
                        title: `${club.shortCode} Voice Note Draft`,
                        caption: transcriptText,
                        hashtags: ['#CUNYSPS', `#${club.shortCode.replace(/[^A-Z0-9]/gi, '')}`],
                        aiAssisted: true,
                      });
                      onSendDraftToStudio();
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md cursor-pointer"
                  >
                    <span>Send Transcript to Content Studio</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'captions' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <form
                onSubmit={handleGenerateCaption}
                className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4"
              >
                <h2 className="text-sm font-semibold text-slate-900">
                  AI-001: Event Caption Generation
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Event Name
                    </label>
                    <input
                      type="text"
                      required
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Time</label>
                    <input
                      type="text"
                      required
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Target Platform
                    </label>
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                    >
                      <option>Instagram Professional</option>
                      <option>Facebook Pages</option>
                      <option>LinkedIn</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Desired Tone
                    </label>
                    <input
                      type="text"
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Target Audience
                  </label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Event Description
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{loading ? 'Generating Draft...' : 'Generate Suggested Caption'}</span>
                </button>
              </form>

              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Suggested Draft Output (Requires Human Review)
                  </h2>
                  {captionResult && (
                    <span className="text-[11px] font-mono text-slate-500">
                      {captionResult.modelUsed}
                    </span>
                  )}
                </div>

                {!captionResult ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    Submit event parameters to generate an editable social media draft.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Editable Proposed Caption
                      </label>
                      <textarea
                        rows={5}
                        value={captionResult.caption}
                        onChange={(e) =>
                          setCaptionResult({ ...captionResult, caption: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                      />
                    </div>
                    <div className="text-xs space-y-2">
                      <div>
                        <span className="font-semibold text-slate-700">Suggested Hashtags:</span>{' '}
                        <span className="text-[#004B87]">{captionResult.hashtags.join(' ')}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">Call to Action:</span>{' '}
                        <span>{captionResult.callToAction}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-600">
                        Accessibility tip: {captionResult.accessibilityNote}
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setCaptionResult(null)}
                        className="px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
                      >
                        Reject Draft
                      </button>
                      <button
                        type="button"
                        onClick={sendCaptionToStudio}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md cursor-pointer"
                      >
                        <span>Send to Content Studio Draft</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'adapt' && (
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
              <form onSubmit={handleAdapt} className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  AI-002: Cross-Platform Adaptation
                </h2>
                <p className="text-xs text-slate-500">
                  Generates distinct formatting tailored to each network instead of duplicating
                  identical text.
                </p>
                <textarea
                  rows={3}
                  required
                  value={baseCaption}
                  onChange={(e) => setBaseCaption(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md cursor-pointer"
                >
                  {loading ? 'Adapting...' : 'Generate Platform Variations'}
                </button>
              </form>

              {adaptResult && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
                  <div className="p-4 border border-slate-200 rounded-md space-y-2">
                    <div className="text-xs font-bold text-slate-900">Facebook Pages</div>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap">
                      {adaptResult.facebookPages}
                    </p>
                  </div>
                  <div className="p-4 border border-slate-200 rounded-md space-y-2">
                    <div className="text-xs font-bold text-slate-900">Instagram Professional</div>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap">
                      {adaptResult.instagramProfessional}
                    </p>
                  </div>
                  <div className="p-4 border border-slate-200 rounded-md space-y-2">
                    <div className="text-xs font-bold text-slate-900">LinkedIn (Later Phase)</div>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap">
                      {adaptResult.linkedin}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'ideas' && (
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    AI-004: Club Content Idea Suggestions
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tailored to {club.name}'s mission and upcoming scheduled events.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void handleIdeas()}
                  className="px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md whitespace-nowrap cursor-pointer"
                >
                  {loading ? 'Brainstorming...' : 'Suggest Content Ideas'}
                </button>
              </div>
              {ideasResult.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ideasResult.map((idea, idx) => (
                    <div key={idx} className="p-4 border border-slate-200 rounded-md space-y-2">
                      <div className="text-xs text-[#004B87] font-medium">
                        {idea.platform} · {idea.format}
                      </div>
                      <div className="text-sm font-semibold text-slate-900">{idea.title}</div>
                      <p className="text-xs text-slate-700">{idea.summary}</p>
                      <div className="text-xs text-slate-500 pt-1">
                        Suggested Hook: {idea.hook}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setDraftHandoff({
                            title: idea.title,
                            caption: `${idea.hook}\n\n${idea.summary}`,
                            hashtags: ['#CUNYSPS', `#${club.shortCode.replace(/[^A-Z0-9]/gi, '')}`],
                            aiAssisted: true,
                          });
                          onSendDraftToStudio();
                        }}
                        className="text-xs font-medium text-[#004B87] hover:underline pt-1 cursor-pointer"
                      >
                        Draft this idea in Content Studio
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'accessibility' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <form
                onSubmit={handleAccessibility}
                className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4"
              >
                <h2 className="text-sm font-semibold text-slate-900">
                  AI-005: WCAG 2.2 AA Accessibility & Alt-Text Helper
                </h2>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Draft Caption to Review
                  </label>
                  <textarea
                    rows={3}
                    value={a11yCaption || baseCaption}
                    onChange={(e) => setA11yCaption(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Image / Flyer Visual Contents
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={visualDescription}
                    onChange={(e) => setVisualDescription(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md cursor-pointer"
                >
                  {loading ? 'Analyzing...' : 'Generate Alt-Text & Readability Check'}
                </button>
              </form>

              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                <h2 className="text-sm font-semibold text-slate-900">Accessibility Review</h2>
                {!a11yResult ? (
                  <div className="py-10 text-center text-xs text-slate-500">
                    Submit caption and visual notes to generate compliant alt-text.
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    <div>
                      <div className="font-semibold text-slate-700">Suggested Image Alt-Text</div>
                      <p className="mt-1 p-3 bg-slate-50 border border-slate-200 rounded text-slate-900">
                        {a11yResult.altTextSuggestion}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 font-medium text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Readability: {a11yResult.readabilityScoreLabel}</span>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-700 mb-1">Recommendations</div>
                      <ul className="space-y-1 text-slate-600 list-disc pl-4">
                        {a11yResult.recommendations.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
