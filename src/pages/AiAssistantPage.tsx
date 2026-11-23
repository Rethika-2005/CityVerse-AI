import React, { useState } from 'react';
import { Send, FileText } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

const SUGGESTED_PROMPTS = [
  'What is the current traffic condition in Anna Nagar?',
  'Which zone has the highest pollution?',
  'Which area has excessive electricity consumption?',
  'Identify areas with possible water shortages.',
  'What are the most critical emergency incidents?',
  'Suggest improvements for Chennai city management.',
];

export function AiAssistantPage() {
  const { isAdmin } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendQuestion(questionText: string) {
    const trimmed = questionText.trim();
    if (!trimmed || loading) return;
    setError(null);
    const updatedHistory: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(updatedHistory);
    setInput('');
    setLoading(true);
    try {
      const res = await api.post<{ answer: string; contextTimestamp: string }>('/ai/chat', {
        question: trimmed,
        history: messages,
      });
      setMessages([
        ...updatedHistory,
        { role: 'assistant', content: res.data.answer, timestamp: res.data.contextTimestamp },
      ]);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Unable to reach Gemini decision support service.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateBriefing() {
    setBriefingLoading(true);
    setError(null);
    try {
      const res = await api.post<{ briefing: string; generatedAt: string }>('/ai/executive-briefing');
      setBriefing(res.data.briefing);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Unable to generate executive briefing.';
      setError(msg);
    } finally {
      setBriefingLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-50 tracking-tight">
            AI Decision Support Assistant
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Powered by Google Gemini · Grounded strictly in live CityVerse AI database snapshots
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={handleGenerateBriefing}
            disabled={briefingLoading}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 rounded-md transition-colors cursor-pointer whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{briefingLoading ? 'Generating Briefing...' : 'Generate Executive Briefing'}</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-950/50 border border-rose-800/70 rounded-lg text-xs text-rose-200">
          {error}
        </div>
      )}

      {briefing && (
        <div className="bg-[#0D1526] border border-cyan-500/40 rounded-lg p-5 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-cyan-400">Administrator Executive Decision-Support Summary</h3>
            <button
              type="button"
              onClick={() => setBriefing(null)}
              className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
          <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{briefing}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Prompt Suggestions */}
        <div className="lg:col-span-4 bg-[#0D1526] border border-slate-800/80 rounded-lg p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-100">Suggested Operational Queries</h3>
          <p className="text-xs text-slate-400">
            Select a prompt or ask any question about traffic, pollution, utilities, or emergencies.
          </p>
          <div className="space-y-2 pt-1">
            {SUGGESTED_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => sendQuestion(q)}
                disabled={loading}
                className="w-full text-left p-3 bg-[#070D19] hover:bg-slate-800/70 border border-slate-800/80 rounded-md text-xs text-slate-300 transition-colors cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Workspace */}
        <div className="lg:col-span-8 bg-[#0D1526] border border-slate-800/80 rounded-lg flex flex-col h-[540px]">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-2">
                <h3 className="text-sm font-semibold text-slate-200">CityVerse AI Ready</h3>
                <p className="text-xs text-slate-400">
                  Every answer is grounded in current zone health scores, sensor telemetry, open emergency incidents, and multi-agent findings stored in the database.
                </p>
              </div>
            ) : (
              messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-cyan-500/10 border border-cyan-500/30 text-slate-100 ml-8'
                      : 'bg-[#070D19] border border-slate-800/80 text-slate-200 mr-8'
                  }`}
                >
                  <div className="text-xs font-medium text-slate-400 mb-1.5">
                    {m.role === 'user' ? 'Operator Query' : 'CityVerse AI Decision Support'}
                  </div>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              ))
            )}
            {loading && (
              <div className="p-4 rounded-lg bg-[#070D19] border border-slate-800/80 text-xs text-slate-400 mr-8">
                Analyzing live database snapshot with Gemini...
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendQuestion(input);
            }}
            className="p-4 border-t border-slate-800/80 flex items-center gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about city congestion, AQI hotspots, grid optimization, or emergency response..."
              className="flex-1 px-3.5 py-2.5 bg-[#070D19] border border-slate-700/80 rounded-md text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold text-xs rounded-md transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
