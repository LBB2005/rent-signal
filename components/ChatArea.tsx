'use client';

import { useEffect, useRef, useState } from 'react';
import { Message, Area, AgentRun, AGENT_META, Listing } from '@/lib/types';
import PromptChips from './PromptChips';
import RightPanel from './RightPanel';
import RichMarkdown from './RichMarkdown';

// ── Design tokens ──────────────────────────────────────────────────────────
const A = {
  canvas: '#FBFAF6',
  card: '#FFFFFF',
  ink: '#1A1916',
  ink2: '#3F3E39',
  mute: '#75736A',
  faint: '#A6A39A',
  hair: '#EBE7DC',
  hairSoft: '#F1EDE2',
  brand: '#3F7D4A',
  brandDeep: '#2E5E37',
  brandSoft: '#EEF3E9',
  brandSoftBorder: '#DDE8D2',
  amber: '#8A6A1E',
  amberSoft: '#FBF5E8',
  amberBorder: '#EFE2C2',
};

const FONT  = "var(--font-inter), 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif";
const SERIF = "var(--font-source-serif), 'Source Serif 4', 'Iowan Old Style', Georgia, serif";

// ── Icons ──────────────────────────────────────────────────────────────────
const IconSparkle = ({ size = 11, color = A.brand }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <path d="M7 1l1.4 4.2L12.5 7 8.4 8.4 7 12.5 5.6 8.4 1.5 7l4.1-1.4L7 1z" fill={color} />
  </svg>
);
const IconPanelRight = ({ active }: { active: boolean }) => {
  const c = active ? A.brandDeep : A.mute;
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="10" rx="2" stroke={c} strokeWidth="1.5" />
      <rect x="9.8" y="3" width="4.2" height="10" rx="2" fill={active ? A.brandSoftBorder : 'none'} stroke={c} strokeWidth="1.5" />
    </svg>
  );
};
const IconShare = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="3" cy="7" r="1.8" stroke={A.mute} strokeWidth="1.4" />
    <circle cx="11" cy="3" r="1.8" stroke={A.mute} strokeWidth="1.4" />
    <circle cx="11" cy="11" r="1.8" stroke={A.mute} strokeWidth="1.4" />
    <path d="M5 6l4-2M5 8l4 2" stroke={A.mute} strokeWidth="1.4" />
  </svg>
);
const IconPencil = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 12l2-1 7-7-1-1-7 7-1 2zM9 4l1 1" stroke={A.mute} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconArrowUp = () => (
  <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
    <path d="M6 10V2m0 0L2.5 5.5M6 2l3.5 3.5" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const iconBtn: React.CSSProperties = {
  width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', border: 'none', borderRadius: 7, cursor: 'pointer',
};

// ── Markdown renderer ──────────────────────────────────────────────────────
function inlineFmt(t: string) {
  return t
    .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${A.ink};font-weight:600">$1</strong>`)
    .replace(/_(.+?)_/g, `<em style="color:${A.mute}">$1</em>`);
}

function Markdown({ text }: { text: string }) {
  return (
    <div>
      {text.split('\n').map((line, i) => {
        if (line.startsWith('## '))
          return (
            <div key={i} style={{
              fontFamily: SERIF, fontWeight: 500, fontSize: 20,
              color: A.ink, lineHeight: 1.35, letterSpacing: '-0.02em',
              marginTop: 12, marginBottom: 6,
            }}>{line.slice(3)}</div>
          );
        if (line.startsWith('### '))
          return (
            <div key={i} style={{
              fontWeight: 600, fontSize: 13, color: A.ink,
              marginTop: 10, marginBottom: 4,
            }}>{line.slice(4)}</div>
          );
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 5 }}>
              <span style={{ color: A.brand, marginTop: 3, flexShrink: 0, fontSize: 16, lineHeight: 1 }}>·</span>
              <span style={{ fontSize: 14.5, lineHeight: 1.65, color: A.ink2 }}
                dangerouslySetInnerHTML={{ __html: inlineFmt(line.slice(2)) }} />
            </div>
          );
        if (line === '') return <div key={i} style={{ height: 8 }} />;
        return (
          <div key={i} style={{ marginBottom: 5, fontSize: 14.5, lineHeight: 1.65, color: A.ink2 }}
            dangerouslySetInnerHTML={{ __html: inlineFmt(line) }} />
        );
      })}
    </div>
  );
}

// ── AI response header ─────────────────────────────────────────────────────
function AssistantHeader({ sources }: { sources?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <div style={{
        width: 24, height: 24, borderRadius: 999,
        background: A.brandSoft, border: `1px solid ${A.brandSoftBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <IconSparkle size={11} color={A.brand} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: A.mute, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>Rent Signal</span>
      <span style={{ fontSize: 11, color: A.faint }}>· {sources ?? 'Searched 23 sources · 4.2s'}</span>
    </div>
  );
}

// ── Citation chip ──────────────────────────────────────────────────────────
function Citation({ url }: { url: string }) {
  if (!url) return null;
  let host = url;
  try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { /* keep raw */ }
  const letter = (host?.[0] ?? '?').toUpperCase();
  const display = host.length > 28 ? host.slice(0, 28) + '…' : host;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '3px 9px 3px 4px', borderRadius: 999,
        background: 'transparent', border: `1px solid ${A.hair}`,
        fontSize: 11, color: A.mute, fontWeight: 500,
        transition: 'border-color 0.12s, background 0.12s',
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = A.hairSoft; (e.currentTarget as HTMLElement).style.borderColor = A.faint; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = A.hair; }}
      >
        <span style={{
          width: 16, height: 16, borderRadius: 999, background: A.hairSoft, color: A.ink,
          fontSize: 9, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>{letter}</span>
        {display}
      </span>
    </a>
  );
}

// ── Agent status panel ─────────────────────────────────────────────────────
function AgentStatusPanel({ agents, statusMsg }: { agents: AgentRun[]; statusMsg: string | null }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <AssistantHeader sources={statusMsg ?? 'Analyzing…'} />
      {agents.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {agents.map(({ agent, status }, idx) => {
            const { label } = AGENT_META[agent];
            const statusStyles: Record<string, { background: string; borderColor: string; color: string }> = {
              running: { background: A.amberSoft, borderColor: A.amberBorder, color: A.amber },
              done:    { background: A.brandSoft, borderColor: A.brandSoftBorder, color: A.brandDeep },
              error:   { background: '#FFF1F2', borderColor: '#FECDD3', color: '#BE123C' },
              pending: { background: A.hairSoft, borderColor: A.hair, color: A.mute },
            };
            const s = statusStyles[status] ?? { background: A.hairSoft, borderColor: A.hair, color: A.mute };
            const chipClass =
              status === 'running' ? 'agent-chip agent-chip--running' :
              status === 'done'    ? 'agent-chip agent-chip--done' :
              'agent-chip';
            return (
              <span
                key={agent}
                className={chipClass}
                style={{
                  '--chip-i': idx,
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', borderRadius: 8,
                  border: `1px solid ${s.borderColor}`,
                  background: s.background as string, color: s.color as string,
                  fontSize: 12, fontWeight: 600,
                } as React.CSSProperties}
              >
                {label}
                {status === 'done' && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke={A.brand} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {status === 'error' && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 2l6 6M8 2l-6 6" stroke="#BE123C" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                )}
                {status === 'running' && (
                  <span style={{ display: 'inline-flex', gap: 2.5, alignItems: 'center' }}>
                    {[0, 160, 320].map((delay, i) => (
                      <span key={i} style={{
                        width: 3.5, height: 3.5, borderRadius: 999, background: A.amber,
                        display: 'inline-block',
                        animation: `dot-wave 1.2s ${delay}ms ease-in-out infinite`,
                      }} />
                    ))}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── ChatArea ────────────────────────────────────────────────────────────────
interface ChatAreaProps {
  area: Area | null;
  messages: Message[];
  isLoading: boolean;
  activeAgents: AgentRun[];
  statusMsg: string | null;
  streamingContent: string;
  inputValue: string;
  rightPanelOpen: boolean;
  listings: Listing[];
  listingsLoading: boolean;
  onInputChange: (val: string) => void;
  onSend: () => void;
  onSelectPrompt: (p: string) => void;
  onToggleRightPanel: () => void;
}

const RIGHT_MIN = 280;
const RIGHT_MAX = 560;

export default function ChatArea({
  area, messages, isLoading, activeAgents, statusMsg, streamingContent,
  inputValue, rightPanelOpen, listings, listingsLoading,
  onInputChange, onSend, onSelectPrompt, onToggleRightPanel,
}: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const [sending, setSending] = useState(false);
  const [rightPanelWidth, setRightPanelWidth] = useState(380);
  const [rightDragging,   setRightDragging]   = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('appraise-right-panel-width');
    if (saved) setRightPanelWidth(Math.min(RIGHT_MAX, Math.max(RIGHT_MIN, Number(saved))));
  }, []);

  function handleRightResizeStart(e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightPanelWidth;
    let currentWidth = startWidth;
    setRightDragging(true);
    document.body.style.userSelect = 'none';
    function onMove(ev: MouseEvent) {
      currentWidth = Math.min(RIGHT_MAX, Math.max(RIGHT_MIN, startWidth - (ev.clientX - startX)));
      setRightPanelWidth(currentWidth);
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      setRightDragging(false);
      document.body.style.userSelect = '';
      localStorage.setItem('appraise-right-panel-width', String(currentWidth));
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, activeAgents]);

  const handleSend = () => {
    if (!inputValue.trim() || isLoading || sending) return;
    setSending(true);
    setTimeout(() => { onSend(); setSending(false); }, 160);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
  };

  const showAgentPanel = isLoading && (activeAgents.length > 0 || statusMsg !== null);
  const hasMessages    = messages.length > 0;
  const followUpChips  = hasMessages
    ? ['Why is 1604 Lucile cheaper?', 'Parking situation', 'Compare to Echo Park', 'Walkability deep-dive']
    : ['Is this price fair?', 'Reddit sentiment', 'Compare nearby areas', 'Commute times'];

  return (
    <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>
      <main style={{
        flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0,
        background: A.canvas, fontFamily: FONT,
      }}>
        {/* ── Sub-header / breadcrumb ── */}
        {area && (
          <div style={{
            padding: '18px 32px 0', display: 'flex', alignItems: 'center', gap: 10,
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 11, color: A.faint, fontWeight: 500 }}>Chat</span>
            <span style={{ color: A.faint, fontSize: 13 }}>›</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: A.ink2, letterSpacing: '-0.012em' }}>
              {area.name}, {area.city}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 11, color: A.brandDeep, fontWeight: 500, marginLeft: 4,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: A.brand }} /> Live
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
              <button title="Share" className="btn-icon" style={iconBtn}><IconShare /></button>
              <button title="Rename" className="btn-icon" style={iconBtn}><IconPencil /></button>
              <button
                title={rightPanelOpen ? 'Hide data panel' : 'Show data panel'}
                onClick={onToggleRightPanel}
                className="btn-icon"
                style={{ ...iconBtn, background: rightPanelOpen ? A.brandSoft : 'transparent' }}
              >
                <IconPanelRight active={rightPanelOpen} />
              </button>
            </div>
          </div>
        )}

        {/* ── Messages ── */}
        <div style={{ flex: 1, overflow: 'auto', padding: hasMessages ? '24px 32px 16px' : '0' }}>
          {!hasMessages && !isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100%' }}>
              <PromptChips onSelectPrompt={onSelectPrompt} areaName={area ? `${area.name}, ${area.city}` : undefined} />
            </div>
          ) : (
            <div style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
              {messages.map((msg) => (
                <div key={msg.id} className="msg-enter">
                  {msg.role === 'user' ? (
                    // User message — light green tint
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 26 }}>
                      <div style={{
                        maxWidth: '82%',
                        background: 'rgba(46,94,55,.06)',
                        color: A.ink,
                        padding: '11px 16px', borderRadius: 14,
                        fontSize: 14.5, lineHeight: 1.55, letterSpacing: '-0.011em',
                        border: '1px solid rgba(46,94,55,.12)',
                      }}>
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    // AI response — prose style
                    <div style={{ marginBottom: 32 }}>
                      {msg.agentRun && msg.agentRun.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                          {msg.agentRun.map(({ agent }) => (
                            <span key={agent} style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '2px 8px', borderRadius: 6,
                              background: A.brandSoft, border: `1px solid ${A.brandSoftBorder}`,
                              color: A.brandDeep, fontSize: 11, fontWeight: 600,
                            }}>
                              {AGENT_META[agent].label}
                            </span>
                          ))}
                        </div>
                      )}
                      <AssistantHeader sources={msg.sources?.length ? `Searched ${msg.sources.length} source${msg.sources.length === 1 ? '' : 's'}` : undefined} />
                      <div style={{ paddingLeft: 2 }}>
                        <RichMarkdown text={msg.content} />
                      </div>
                      {msg.sources && msg.sources.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 18 }}>
                          <span style={{ fontSize: 11, color: A.faint, fontWeight: 500, marginRight: 2, alignSelf: 'center' }}>Sources</span>
                          {msg.sources.filter(Boolean).slice(0, 10).map(url => <Citation key={url} url={url} />)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {showAgentPanel && (
                streamingContent ? (
                  <div style={{ marginBottom: 32 }}>
                    {activeAgents.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                        {activeAgents.map(({ agent }) => (
                          <span key={agent} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '2px 8px', borderRadius: 6,
                            background: A.brandSoft, border: `1px solid ${A.brandSoftBorder}`,
                            color: A.brandDeep, fontSize: 11, fontWeight: 600,
                          }}>
                            {AGENT_META[agent].label}
                          </span>
                        ))}
                      </div>
                    )}
                    <AssistantHeader sources="Generating report…" />
                    <div style={{ paddingLeft: 2 }}>
                      <RichMarkdown text={streamingContent} />
                    </div>
                  </div>
                ) : (
                  <AgentStatusPanel agents={activeAgents} statusMsg={statusMsg} />
                )
              )}

              {isLoading && !showAgentPanel && (
                <div style={{ marginBottom: 28 }}>
                  <AssistantHeader sources="Thinking…" />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 2, paddingTop: 4 }}>
                    {[0, 160, 320].map(delay => (
                      <span key={delay} style={{
                        width: 6, height: 6, background: A.brand, borderRadius: 999,
                        display: 'inline-block', animation: `dot-wave 1.2s ${delay}ms ease-in-out infinite`,
                      }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ── Composer ── */}
        <div style={{ padding: '8px 32px 22px', background: A.canvas, flexShrink: 0 }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            {/* Follow-up chips */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {followUpChips.map(p => (
                <button key={p} onClick={() => onSelectPrompt(p)} className="chip-btn" style={{
                  padding: '6px 11px', fontSize: 12, color: A.mute, fontWeight: 500,
                  background: 'transparent', border: `1px solid ${A.hair}`,
                  borderRadius: 999, cursor: 'pointer', letterSpacing: '-0.005em', fontFamily: FONT,
                }}>{p}</button>
              ))}
            </div>

            {/* Composer pill */}
            <div className="composer-pill" style={{
              background: A.card,
              border: `1px solid ${A.hairSoft}`,
              borderRadius: 16,
              padding: '8px',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: [
                '0 0 0 1px rgba(63,125,74,0.05)',
                '0 0 0 4px rgba(63,125,74,0.03)',
                '0 1px 0 rgba(0,0,0,0.02)',
                '0 14px 32px -18px rgba(60,52,28,0.12)',
                '0 0 28px -6px rgba(63,125,74,0.08)',
              ].join(', '),
            }}>
              {/* + button */}
              <button title="Add" className="btn-icon" style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: A.hairSoft, border: `1px solid ${A.hair}`,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1.5v11M1.5 7h11" stroke={A.ink2} strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              </button>

              {/* Textarea — vertically centered */}
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center',
                minHeight: 34, padding: '0 4px',
              }}>
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  placeholder={area ? `Ask anything about ${area.name}…` : 'Ask about any neighborhood, city, or listing…'}
                  rows={1}
                  style={{
                    width: '100%', border: 'none', outline: 'none', resize: 'none',
                    fontSize: 15, background: 'transparent', color: A.ink,
                    lineHeight: '1.5', maxHeight: 140, padding: '0',
                    letterSpacing: '-0.011em', fontFamily: FONT,
                    opacity: sending ? 0 : 1,
                    transition: 'opacity 0.15s ease',
                  }}
                />
              </div>

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading || sending}
                className="send-btn"
                style={{
                  height: 34, width: 34, borderRadius: 10, flexShrink: 0,
                  background: inputValue.trim() && !isLoading ? A.brand : '#CEC9BE',
                  border: 'none',
                  cursor: inputValue.trim() && !isLoading ? 'pointer' : 'default',
                  color: 'white',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: inputValue.trim() && !isLoading
                    ? '0 1px 0 rgba(0,0,0,.04), 0 2px 6px -2px rgba(63,125,74,.45)'
                    : 'none',
                }}
              >
                <IconArrowUp />
              </button>
            </div>

            <div style={{ textAlign: 'center', fontSize: 11, color: A.faint, marginTop: 8 }}>
              Rent Signal searches Zillow, Reddit, and Yelp · Always verify before signing
            </div>
          </div>
        </div>
      </main>

      {/* ── Right panel ── */}
      {area && (
        <>
          {rightPanelOpen && (
            <div
              className={`resize-handle${rightDragging ? ' resize-handle--active' : ''}`}
              onMouseDown={handleRightResizeStart}
            />
          )}
          <div style={{
            width: rightPanelOpen ? rightPanelWidth : 0,
            transition: rightDragging ? 'none' : 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'hidden',
            flexShrink: 0,
          }}>
            <RightPanel
              areaName={`${area.name}, ${area.city}`}
              listings={listings}
              listingsLoading={listingsLoading}
              onCollapse={onToggleRightPanel}
            />
          </div>
        </>
      )}
    </div>
  );
}
