'use client';

import { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Area, Message, AgentName, AgentRun, Conversation, Listing } from '@/lib/types';
import { loadUserData, saveUserData } from '@/lib/storage';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';

// ── Icons ──────────────────────────────────────────────────────────────────
const IconGear = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="2" stroke="#64748B" strokeWidth="1.4" />
    <path d="M8 2v1.5M8 12.5V14M14 8h-1.5M3.5 8H2M12.2 3.8l-1 1M4.8 11.2l-1 1M12.2 12.2l-1-1M4.8 4.8l-1-1" stroke="#64748B" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);
const IconPanelLeft = ({ active }: { active: boolean }) => {
  const c = active ? '#0F172A' : '#64748B';
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="10" rx="1.5" stroke={c} strokeWidth="1.5" />
      <rect x="2" y="3" width="4" height="10" rx="1.5" fill={active ? '#E2E8F0' : 'none'} stroke={c} strokeWidth="1.5" />
    </svg>
  );
};

// ── Rent Signal Logo ───────────────────────────────────────────────────────
function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.3, color: '#2E5E37', lineHeight: 1 }}>Rent</span>
      <span style={{ fontWeight: 500, fontSize: 18, letterSpacing: -0.3, color: '#2E5E37', lineHeight: 1 }}>Signal</span>
    </div>
  );
}

// ── Top Nav ────────────────────────────────────────────────────────────────
const iconBtnBase: React.CSSProperties = {
  width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer',
};

function TopNav({ sidebarOpen, onToggleSidebar }: {
  sidebarOpen: boolean; onToggleSidebar: () => void;
}) {
  const router = useRouter();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '0 16px', height: 42, background: 'white',
      borderBottom: '1px solid #E2E8F0', flexShrink: 0,
    }}>
      <button className="btn-icon" onClick={onToggleSidebar} title={sidebarOpen ? 'Collapse sidebar' : 'Show sidebar'} style={iconBtnBase}>
        <IconPanelLeft active={sidebarOpen} />
      </button>

      <div style={{ marginRight: 'auto' }}><Logo /></div>

      <button className="btn-icon" onClick={() => router.push('/settings')} title="Settings" style={iconBtnBase}>
        <IconGear />
      </button>
    </div>
  );
}

// ── New area modal ─────────────────────────────────────────────────────────
function NewAreaModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (name: string, city: string, state: string) => void;
}) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(26,25,22,0.32)', backdropFilter: 'blur(2px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-enter" style={{
        background: '#FFFFFF', borderRadius: 18,
        boxShadow: '0 24px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(63,125,74,0.05)',
        width: '100%', maxWidth: 460, padding: 26,
        border: '1px solid #F1EDE2',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
          <div style={{ width: 40, height: 40, background: '#EEF3E9', border: '1px solid #DDE8D2', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
              <path d="M7 1c-2.5 0-4.5 2-4.5 4.5 0 3.5 4.5 7 4.5 7s4.5-3.5 4.5-7C11.5 3 9.5 1 7 1z" stroke="#3F7D4A" strokeWidth="1.3" strokeLinejoin="round" />
              <circle cx="7" cy="5.5" r="1.8" stroke="#3F7D4A" strokeWidth="1.3" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, color: '#1A1916', fontFamily: "var(--font-source-serif), Georgia, serif", letterSpacing: '-0.012em' }}>Add new area</div>
            <div style={{ fontSize: 12.5, color: '#75736A', marginTop: 2 }}>Search any neighborhood or city</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#75736A', marginBottom: 6, letterSpacing: '0.02em' }}>Neighborhood / Area name</label>
            <input autoFocus type="text" placeholder="e.g. Silver Lake, Williamsburg, Hyde Park" value={name} onChange={e => setName(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', border: `1px solid ${name ? '#DDE8D2' : '#EBE7DC'}`, borderRadius: 10, fontSize: 14, color: '#1A1916', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#FFFFFF', boxShadow: name ? '0 0 0 3px rgba(63,125,74,0.07)' : 'none', transition: 'border-color 0.15s, box-shadow 0.15s' }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#75736A', marginBottom: 6 }}>City</label>
              <input type="text" placeholder="Los Angeles" value={city} onChange={e => setCity(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', border: '1px solid #EBE7DC', borderRadius: 10, fontSize: 14, color: '#1A1916', outline: 'none', fontFamily: 'inherit', background: '#FFFFFF' }} />
            </div>
            <div style={{ width: 80 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#75736A', marginBottom: 6 }}>State</label>
              <input type="text" placeholder="CA" value={state} onChange={e => setState(e.target.value.toUpperCase().slice(0, 2))}
                style={{ width: '100%', padding: '11px 14px', border: '1px solid #EBE7DC', borderRadius: 10, fontSize: 14, color: '#1A1916', outline: 'none', fontFamily: 'inherit', background: '#FFFFFF' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '11px 0', border: '1px solid #EBE7DC', borderRadius: 10, fontSize: 13.5, fontWeight: 600, color: '#75736A', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            <button onClick={() => name && city && onCreate(name, city, state)} disabled={!name || !city}
              style={{ flex: 1, padding: '11px 0', border: 'none', borderRadius: 10, fontSize: 13.5, fontWeight: 600, color: 'white', background: name && city ? '#3F7D4A' : '#CEC9BE', cursor: name && city ? 'pointer' : 'default', fontFamily: 'inherit', boxShadow: name && city ? '0 2px 6px -2px rgba(63,125,74,.45)' : 'none' }}>
              Start researching
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SSE parser ─────────────────────────────────────────────────────────────
function parseSse(chunk: string): { event: string; data: unknown }[] {
  const results: { event: string; data: unknown }[] = [];
  for (const block of chunk.split('\n\n')) {
    if (!block.trim()) continue;
    let event = 'message', dataStr = '';
    for (const line of block.split('\n')) {
      if (line.startsWith('event: ')) event = line.slice(7).trim();
      if (line.startsWith('data: '))  dataStr = line.slice(6).trim();
    }
    if (dataStr) { try { results.push({ event, data: JSON.parse(dataStr) }); } catch { /**/ } }
  }
  return results;
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function ChatPage() {
  const [visible, setVisible] = useState(true);
  const enteringRef = useRef(false);

  useLayoutEffect(() => {
    if (sessionStorage.getItem('chat-enter') === '1') {
      enteringRef.current = true;
      setVisible(false);
    }
  }, []);

  useEffect(() => {
    if (!enteringRef.current) return;
    sessionStorage.removeItem('chat-enter');
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setVisible(true)),
    );
    return () => cancelAnimationFrame(id);
  }, []);

  const { data: session } = useSession();
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
  const loadedRef = useRef(false);

  const [areas,            setAreas]            = useState<Area[]>([]);
  const [conversations,    setConversations]     = useState<Conversation[]>([]);
  const [activeAreaId,     setActiveAreaId]      = useState<string | null>(null);
  const [activeConvId,     setActiveConvId]      = useState<string | null>(null);
  const [messagesByConv,   setMessagesByConv]    = useState<Record<string, Message[]>>({});
  const [inputValue,       setInputValue]        = useState('');
  const [isLoading,        setIsLoading]         = useState(false);
  const [activeAgents,     setActiveAgents]      = useState<AgentRun[]>([]);
  const [statusMsg,        setStatusMsg]         = useState<string | null>(null);
  const [streamingContent, setStreamingContent]  = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed]  = useState(false);
  const [sidebarWidth,     setSidebarWidth]      = useState(264);
  const [sidebarDragging,  setSidebarDragging]   = useState(false);
  const [rightPanelOpen,   setRightPanelOpen]    = useState(true);
  const [showModal,        setShowModal]         = useState(false);
  const [listings,         setListings]          = useState<Listing[]>([]);
  const [listingsLoading,  setListingsLoading]   = useState(false);
  const fetchedAreaRef = useRef<string | null>(null);

  const SIDEBAR_MIN = 180;
  const SIDEBAR_MAX = 400;

  useEffect(() => {
    const saved = localStorage.getItem('appraise-sidebar-width');
    if (saved) setSidebarWidth(Math.min(400, Math.max(180, Number(saved))));
  }, []);

  function handleSidebarResizeStart(e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    let currentWidth = startWidth;
    setSidebarDragging(true);
    document.body.style.userSelect = 'none';
    function onMove(ev: MouseEvent) {
      currentWidth = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startWidth + ev.clientX - startX));
      setSidebarWidth(currentWidth);
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      setSidebarDragging(false);
      document.body.style.userSelect = '';
      localStorage.setItem('appraise-sidebar-width', String(currentWidth));
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // Load persisted data once the user session is ready
  useEffect(() => {
    if (!userId || loadedRef.current) return;
    loadedRef.current = true;
    const saved = loadUserData(userId);
    if (saved) {
      setAreas(saved.areas);
      setConversations(saved.conversations);
      setMessagesByConv(saved.messagesByConv);
      setActiveAreaId(saved.activeAreaId);
      setActiveConvId(saved.activeConvId);
    }
  }, [userId]);

  // Persist state whenever it changes (after initial load)
  useEffect(() => {
    if (!userId || !loadedRef.current) return;
    saveUserData(userId, { areas, conversations, messagesByConv, activeAreaId, activeConvId });
  }, [userId, areas, conversations, messagesByConv, activeAreaId, activeConvId]);

  const activeArea = areas.find(a => a.id === activeAreaId) ?? null;
  const messages   = activeConvId ? (messagesByConv[activeConvId] ?? []) : [];

  const fetchListings = useCallback(async (area: Area) => {
    const location = `${area.name}, ${area.city}, ${area.state}`;
    if (fetchedAreaRef.current === location) return;
    fetchedAreaRef.current = location;
    setListingsLoading(true);
    try {
      const res = await fetch(`/api/listings?location=${encodeURIComponent(location)}`);
      const data = await res.json();
      setListings(data.listings ?? []);
    } catch {
      setListings([]);
    } finally {
      setListingsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeArea) fetchListings(activeArea);
  }, [activeArea, fetchListings]);

  const addMessage = useCallback((convId: string, msg: Message) => {
    setMessagesByConv(prev => ({ ...prev, [convId]: [...(prev[convId] ?? []), msg] }));
  }, []);

  const updateAgent = useCallback((agent: AgentName, status: AgentRun['status']) => {
    setActiveAgents(prev => {
      const exists = prev.find(a => a.agent === agent);
      if (exists) return prev.map(a => a.agent === agent ? { ...a, status } : a);
      return [...prev, { agent, status }];
    });
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;
    const areaId = activeAreaId;
    if (!areaId) return;

    // Ensure an active conversation exists before sending
    let convId = activeConvId;
    if (!convId) {
      convId = `conv-${Date.now()}`;
      const title = content.slice(0, 40) + (content.length > 40 ? '…' : '');
      setConversations(prev => [{ id: convId!, title, preview: '', areaId, createdAt: new Date() }, ...prev]);
      setActiveConvId(convId);
    }
    const thisConvId = convId;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: content.trim(), timestamp: new Date() };
    addMessage(thisConvId, userMsg);
    setInputValue('');
    setIsLoading(true);
    setActiveAgents([]);
    setStatusMsg('Analyzing your question...');
    setStreamingContent('');
    const area = areas.find(a => a.id === areaId);
    if (area) { fetchedAreaRef.current = null; fetchListings(area); }

    const ta = document.querySelector('textarea');
    if (ta) ta.style.height = 'auto';

    try {
      const history = [...(messagesByConv[thisConvId] ?? []), userMsg];
      const areaContext = area ? `${area.name}, ${area.city}, ${area.state}` : undefined;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.map(m => ({ role: m.role, content: m.content })), areaContext }),
      });

      if (!res.body) throw new Error('No response body');
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const blocks = buf.split('\n\n');
        buf = blocks.pop() ?? '';

        for (const block of blocks) {
          for (const { event, data } of parseSse(block + '\n\n')) {
            const d = data as Record<string, unknown>;
            if (event === 'status')   setStatusMsg(d.message as string);
            if (event === 'routing')  { setActiveAgents((d.agents as AgentName[]).map(a => ({ agent: a, status: 'pending' as const }))); setStatusMsg(null); }
            if (event === 'agent')    updateAgent(d.agent as AgentName, d.status as AgentRun['status']);
            if (event === 'chunk')    setStreamingContent(prev => prev + (d.text as string));
            if (event === 'response') {
              setStreamingContent('');
              addMessage(thisConvId, { id: (Date.now() + 1).toString(), role: 'assistant', content: d.content as string, timestamp: new Date(), agentRun: activeAgents, sources: d.sources as string[] | undefined });
              setConversations(prev => prev.map(c =>
                c.id === thisConvId ? { ...c, preview: (d.content as string).slice(0, 50) + '…' } : c
              ));
            }
            if (event === 'error')    addMessage(thisConvId, { id: (Date.now() + 1).toString(), role: 'assistant', content: `Sorry, something went wrong: ${d.message}`, timestamp: new Date() });
          }
        }
      }
    } catch (err) {
      console.error(err);
      addMessage(thisConvId, { id: (Date.now() + 1).toString(), role: 'assistant', content: "Couldn't reach the server. Check `.env.local` is set up.", timestamp: new Date() });
    } finally {
      setIsLoading(false);
      setActiveAgents([]);
      setStatusMsg(null);
      setStreamingContent('');
    }
  }, [activeAreaId, activeConvId, areas, messagesByConv, isLoading, addMessage, updateAgent, activeAgents, fetchListings]);

  const handleCreateArea = (name: string, city: string, state: string) => {
    const a: Area = { id: Date.now().toString(), name, city, state, createdAt: new Date(), messages: [] };
    setAreas(prev => [a, ...prev]);
    setActiveAreaId(a.id);
    setActiveConvId(null);
    setInputValue('');
    setListings([]);
    fetchedAreaRef.current = null;
    setShowModal(false);
  };

  const handleDeleteConv = useCallback((convId: string) => {
    setConversations(prev => {
      const next = prev.filter(c => c.id !== convId);
      if (activeConvId === convId) {
        const replacement = next.find(c => c.areaId === activeAreaId);
        setActiveConvId(replacement?.id ?? null);
      }
      return next;
    });
    setMessagesByConv(prev => {
      const { [convId]: _, ...rest } = prev;
      return rest;
    });
  }, [activeConvId, activeAreaId]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden',
      fontFamily: "var(--font-inter), 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
      color: '#1A1916', background: '#FBFAF6',
      opacity: visible ? 1 : 0,
      transform: visible ? 'none' : 'translateY(3px)',
      transition: 'opacity 0.18s ease-out, transform 0.18s ease-out',
    }}>
      <TopNav sidebarOpen={!sidebarCollapsed} onToggleSidebar={() => setSidebarCollapsed(v => !v)} />

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div style={{
          width: sidebarCollapsed ? 56 : sidebarWidth,
          transition: sidebarDragging ? 'none' : 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          <Sidebar
            areas={areas}
            activeAreaId={activeAreaId}
            conversations={conversations}
            activeConvId={activeConvId}
            messagesByConv={messagesByConv}
            onDeleteConv={handleDeleteConv}
            onSelectArea={id => {
              setActiveAreaId(id);
              setInputValue('');
              setListings([]);
              fetchedAreaRef.current = null;
              const lastConv = conversations.filter(c => c.areaId === id)[0];
              setActiveConvId(lastConv?.id ?? null);
            }}
            onSelectConv={id => {
              setActiveConvId(id);
              const conv = conversations.find(c => c.id === id);
              if (conv) setActiveAreaId(conv.areaId);
            }}
            onNewChat={() => setShowModal(true)}
            collapsed={sidebarCollapsed}
            onCollapse={() => setSidebarCollapsed(true)}
            onExpand={() => setSidebarCollapsed(false)}
          />
        </div>

        {!sidebarCollapsed && (
          <div
            className={`resize-handle${sidebarDragging ? ' resize-handle--active' : ''}`}
            onMouseDown={handleSidebarResizeStart}
          />
        )}

        <ChatArea
          area={activeArea}
          messages={messages}
          isLoading={isLoading}
          activeAgents={activeAgents}
          statusMsg={statusMsg}
          streamingContent={streamingContent}
          inputValue={inputValue}
          rightPanelOpen={rightPanelOpen}
          listings={listings}
          listingsLoading={listingsLoading}
          onInputChange={setInputValue}
          onSend={() => sendMessage(inputValue)}
          onSelectPrompt={p => sendMessage(p)}
          onToggleRightPanel={() => setRightPanelOpen(v => !v)}
        />
      </div>

      {showModal && <NewAreaModal onClose={() => setShowModal(false)} onCreate={handleCreateArea} />}
    </div>
  );
}
