import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ExternalLink,
  Globe,
  Loader2,
  MessageSquare,
  Send,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { ChatMessage, ChatModelId, Club, RoleName } from '../types';
import { AudioRecorderButton } from './AudioRecorderButton';

interface GeminiChatPanelProps {
  club?: Club | null;
  effectiveRole?: RoleName | null;
  onSendReplyToStudio?: (text: string) => void;
}

const ADMIN_PROMPTS = [
  'What governance checks should Student Life run before onboarding a new club social account?',
  'Draft an accessible announcement policy checklist for CUNY SPS student organizations.',
  'How should we handle Facebook & Instagram token expiration alerts during officer transitions?',
];

const CLUB_PROMPTS = [
  'Plan a 2-week social media promotional sequence for an upcoming virtual student workshop.',
  'What WCAG 2.2 accessibility practices should we apply to event flyers and hashtags?',
  'Suggest 3 engaging LinkedIn post angles tailored to online CUNY SPS degree students.',
];

export function GeminiChatPanel({
  club,
  effectiveRole,
  onSendReplyToStudio,
}: GeminiChatPanelProps) {
  const { apiFetch, session } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [model, setModel] = useState<ChatModelId>('gemini-4-hydrogen');
  const [useSearch, setUseSearch] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Reset conversation thread when switching club workspace
  useEffect(() => {
    setMessages([]);
    setError('');
  }, [club?.clubId]);

  const isViewer = effectiveRole === 'VIEWER';
  const suggestions = club ? CLUB_PROMPTS : ADMIN_PROMPTS;

  const sendMessage = async (textToSend?: string) => {
    const cleanText = (textToSend ?? input).trim();
    if (!cleanText || sending || isViewer) return;

    setError('');
    const userMsg: ChatMessage = {
      id: `msg-u-${Date.now()}`,
      role: 'user',
      text: cleanText,
      timestamp: new Date().toISOString(),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    if (!textToSend) setInput('');
    setSending(true);

    try {
      const res = await apiFetch<{
        reply: string;
        modelUsed: ChatModelId;
        sources: { uri: string; title: string }[];
      }>('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          clubId: club?.clubId,
          model,
          useSearch,
          messages: nextHistory.map((m) => ({ role: m.role, text: m.text })),
        }),
      });

      const assistantMsg: ChatMessage = {
        id: `msg-m-${Date.now()}`,
        role: 'model',
        text: res.reply,
        modelUsed: res.modelUsed,
        sources: res.sources,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete Gemini chat turn.');
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col">
      {/* Toolbar Header */}
      <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#004B87] shrink-0" />
            <h2 className="text-sm font-semibold text-slate-900">
              {club ? `${club.name} — Gemini Assistant Chat` : 'Student Life Governance Chat'}
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Role-scoped multi-turn assistant for {session?.user.name} · Conversation history retained
            across turns
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <label htmlFor="chat-model-select" className="text-[11px] font-medium text-slate-600">
              Model:
            </label>
            <select
              id="chat-model-select"
              value={useSearch ? 'gemini-4-hydrogen' : model}
              disabled={useSearch}
              onChange={(e) => setModel(e.target.value as ChatModelId)}
              className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-md text-slate-800 disabled:bg-slate-100"
            >
              <option value="gemini-4-hydrogen">Gemini 4 Hydrogen (General & Grounded)</option>
              <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Fast)</option>
            </select>
          </div>

          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={useSearch}
              onChange={(e) => setUseSearch(e.target.checked)}
            />
            <Globe className="w-3.5 h-3.5 text-[#004B87]" />
            <span>Google Search Grounding</span>
          </label>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setMessages([])}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 border border-slate-300 bg-white hover:bg-slate-50 rounded-md cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Conversation Thread */}
      <div className="p-5 space-y-4 min-h-[340px] max-h-[500px] overflow-y-auto bg-white">
        {messages.length === 0 ? (
          <div className="py-8 space-y-5">
            <div className="text-center space-y-1">
              <div className="text-sm font-semibold text-slate-900">
                Start a multi-turn conversation
              </div>
              <p className="text-xs text-slate-500 max-w-lg mx-auto">
                Ask about campaign planning, WCAG accessibility, platform conventions, or enable
                Google Search Grounding to verify live trends and higher-education updates.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-4xl mx-auto">
              {suggestions.map((promptText, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isViewer}
                  onClick={() => void sendMessage(promptText)}
                  className="text-left p-3 text-xs text-slate-700 bg-slate-50 hover:bg-sky-50/70 border border-slate-200 hover:border-[#004B87] rounded-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  {promptText}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-3 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#004B87] text-white'
                    : 'bg-slate-50 border border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-1 text-[10px] opacity-80">
                  <span className="font-semibold">
                    {msg.role === 'user' ? session?.user.name ?? 'You' : 'CUNY SPS Assistant'}
                  </span>
                  <span className="font-mono-tabular">
                    {msg.modelUsed ? `${msg.modelUsed} · ` : ''}
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200 space-y-1">
                    <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                      <Globe className="w-3 h-3 text-[#004B87]" />
                      <span>Google Search Sources ({msg.sources.length})</span>
                    </div>
                    <ul className="space-y-1">
                      {msg.sources.map((src, i) => (
                        <li key={i}>
                          <a
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-[#004B87] hover:underline break-all"
                          >
                            <span>{src.title}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {msg.role === 'model' && onSendReplyToStudio && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200 flex justify-end">
                    <button
                      type="button"
                      onClick={() => onSendReplyToStudio(msg.text)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-[#004B87] hover:underline cursor-pointer"
                    >
                      <span>Use in Content Studio Draft</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {sending && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#004B87]" />
            <span>
              Generating response{useSearch ? ' with Google Search grounding' : ''}...
            </span>
          </div>
        )}
        <div ref={threadEndRef} />
      </div>

      {error && (
        <div role="alert" className="mx-5 mb-3 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      {/* Input Bar */}
      <form
        onSubmit={handleSubmit}
        className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5"
      >
        <div className="flex-1">
          <label htmlFor="gemini-chat-input" className="sr-only">
            Message Gemini Assistant
          </label>
          <textarea
            id="gemini-chat-input"
            rows={2}
            disabled={isViewer || sending}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
            placeholder={
              isViewer
                ? 'Viewer role has read-only access.'
                : 'Ask a follow-up question, draft ideas, or dictate with the microphone...'
            }
            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87] disabled:bg-slate-100"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isViewer && (
            <AudioRecorderButton
              clubId={club?.clubId}
              compact
              contextHint="User prompt for CUNY SPS social media assistant chat"
              onTranscript={(transcript) =>
                setInput((prev) => (prev ? `${prev} ${transcript}` : transcript))
              }
              onError={setError}
            />
          )}
          <button
            type="submit"
            disabled={isViewer || sending || !input.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md whitespace-nowrap cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </div>
      </form>
    </div>
  );
}
