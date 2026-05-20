'use client';

import { useEffect, useRef } from 'react';
import { Message, Area, AgentRun, AGENT_META } from '@/lib/types';
import PromptChips from './PromptChips';

// ── Markdown renderer ─────────────────────────────────────────────────────
function MarkdownContent({ text }: { text: string }) {
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('## '))
          return <h3 key={i} className="font-semibold text-[15px] text-[#1A1A1A] mt-3 mb-1">{line.slice(3)}</h3>;
        if (line.startsWith('### '))
          return <h4 key={i} className="font-semibold text-[14px] text-[#1A1A1A] mt-2">{line.slice(4)}</h4>;
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-[#D4622A] mt-0.5 flex-shrink-0">•</span>
              <span className="text-[14px] leading-relaxed" dangerouslySetInnerHTML={{ __html: inlineFmt(line.slice(2)) }} />
            </div>
          );
        if (line === '') return <div key={i} className="h-1" />;
        return <p key={i} className="text-[14px] leading-relaxed" dangerouslySetInnerHTML={{ __html: inlineFmt(line) }} />;
      })}
    </div>
  );
}

function inlineFmt(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/`(.+?)`/g,       '<code class="bg-gray-100 px-1 py-0.5 rounded text-[13px] font-mono">$1</code>');
}

// ── Agent status panel ────────────────────────────────────────────────────
function AgentStatusPanel({ agents, statusMsg }: { agents: AgentRun[]; statusMsg: string | null }) {
  return (
    <div className="flex gap-3 flex-row">
      {/* CEO icon */}
      <div className="w-7 h-7 bg-[#D4622A] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <path d="M8 1L1 7h2v7h4v-4h2v4h4V7h2L8 1z" fill="white" />
        </svg>
      </div>

      <div className="space-y-2 pt-0.5">
        {/* Status message (routing / compiling) */}
        {statusMsg && (
          <div className="flex items-center gap-2 text-[13px] text-[#9B8F84]">
            <svg className="animate-spin w-3.5 h-3.5 text-[#D4622A] flex-shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Agent chips */}
        {agents.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {agents.map(({ agent, status }) => {
              const { label, emoji } = AGENT_META[agent];
              const isRunning = status === 'running';
              const isDone    = status === 'done';
              const isError   = status === 'error';
              const isPending = status === 'pending';

              return (
                <div
                  key={agent}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[12px] font-medium transition-all ${
                    isDone    ? 'bg-green-50 border-green-200 text-green-700' :
                    isRunning ? 'bg-orange-50 border-orange-200 text-orange-700' :
                    isError   ? 'bg-red-50 border-red-200 text-red-600' :
                                'bg-[#F7F5F1] border-[#E8E4DC] text-[#9B8F84]'
                  }`}
                >
                  <span>{emoji}</span>
                  <span>{label}</span>
                  {isRunning && (
                    <svg className="animate-spin w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  )}
                  {isDone    && <span className="text-green-500">✓</span>}
                  {isError   && <span className="text-red-500">✕</span>}
                  {isPending && <span className="text-[#C0B8B0]">·</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── ChatArea component ────────────────────────────────────────────────────
interface ChatAreaProps {
  area:          Area | null;
  messages:      Message[];
  isLoading:     boolean;
  activeAgents:  AgentRun[];
  statusMsg:     string | null;
  inputValue:    string;
  onInputChange: (val: string) => void;
  onSend:        () => void;
  onSelectPrompt:(prompt: string) => void;
  onNewArea:     () => void;
}

export default function ChatArea({
  area, messages, isLoading, activeAgents, statusMsg,
  inputValue, onInputChange, onSend, onSelectPrompt, onNewArea,
}: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, activeAgents]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  };

  const showAgentPanel = isLoading && (activeAgents.length > 0 || statusMsg !== null);

  return (
    <div className="flex-1 flex flex-col h-full min-w-0">
      {/* Header */}
      {area && (
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#E8E4DC] bg-white flex-shrink-0">
          <button onClick={onNewArea} className="p-1.5 hover:bg-[#F0EDE8] rounded-lg transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="#9B8F84" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div>
            <h1 className="text-[15px] font-semibold text-[#1A1A1A]">{area.name}</h1>
            <p className="text-[12px] text-[#9B8F84]">{area.city}, {area.state}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#F3F0FF] border border-[#D4C5F9] rounded-full text-[11px] font-medium text-[#6B3FD4]">
              ✦ Multi-agent
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#FDF8F5] border border-[#F0D5C5] rounded-full text-[11px] font-medium text-[#D4622A]">
              <span className="w-1.5 h-1.5 bg-[#D4622A] rounded-full animate-pulse" />
              Live data
            </span>
          </div>
        </div>
      )}

      {/* Messages / welcome */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 && !isLoading ? (
          <div className="flex items-center justify-center min-h-full px-6 py-12">
            <PromptChips onSelectPrompt={onSelectPrompt} areaName={area ? `${area.name}, ${area.city}` : undefined} />
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 bg-[#D4622A] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M8 1L1 7h2v7h4v-4h2v4h4V7h2L8 1z" fill="white" />
                    </svg>
                  </div>
                )}
                <div className={`max-w-[85%] ${msg.role === 'user'
                  ? 'bg-[#1A1A1A] text-white rounded-2xl rounded-tr-sm px-4 py-3'
                  : 'text-[#1A1A1A]'}`}>
                  {msg.role === 'user'
                    ? <p className="text-[14px] leading-relaxed">{msg.content}</p>
                    : (
                      <>
                        {/* Show which agents ran for this message */}
                        {msg.agentRun && msg.agentRun.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {msg.agentRun.map(({ agent }) => {
                              const { emoji, label } = AGENT_META[agent];
                              return (
                                <span key={agent} className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 border border-green-200 rounded-md text-[11px] text-green-700 font-medium">
                                  {emoji} {label}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        <MarkdownContent text={msg.content} />
                      </>
                    )
                  }
                </div>
              </div>
            ))}

            {/* Live agent status panel */}
            {showAgentPanel && (
              <AgentStatusPanel agents={activeAgents} statusMsg={statusMsg} />
            )}

            {/* Simple dots when no agents dispatched yet */}
            {isLoading && !showAgentPanel && (
              <div className="flex gap-3">
                <div className="w-7 h-7 bg-[#D4622A] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1L1 7h2v7h4v-4h2v4h4V7h2L8 1z" fill="white" />
                  </svg>
                </div>
                <div className="flex items-center gap-1.5 pt-2">
                  <span className="w-2 h-2 bg-[#D4622A] rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-[#D4622A] rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-[#D4622A] rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="px-4 py-4 border-t border-[#E8E4DC] bg-white flex-shrink-0">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-3 bg-[#F7F5F1] border border-[#E8E4DC] rounded-2xl px-4 py-3 focus-within:border-[#D4622A] focus-within:bg-white transition-all">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={area ? `Ask anything about ${area.name}...` : 'Ask about any neighborhood, city, or listing...'}
              rows={1}
              className="flex-1 bg-transparent resize-none outline-none text-[14px] text-[#1A1A1A] placeholder-[#B0A89E] leading-relaxed max-h-40"
            />
            <button
              onClick={onSend}
              disabled={!inputValue.trim() || isLoading}
              className="w-8 h-8 bg-[#D4622A] rounded-xl flex items-center justify-center flex-shrink-0 hover:bg-[#C0561F] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 12V2M2 7l5-5 5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <p className="text-center text-[11px] text-[#B0A89E] mt-2">
            4 specialist agents · Live Reddit, Yelp &amp; market data · Always verify before signing
          </p>
        </div>
      </div>
    </div>
  );
}
