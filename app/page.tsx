'use client';

import { useState, useCallback } from 'react';
import { Area, Message, AgentName, AgentRun } from '@/lib/types';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';

const DEMO_AREAS: Area[] = [
  { id: '1', name: 'Hyde Park',    city: 'Cincinnati', state: 'OH', createdAt: new Date(), messages: [] },
  { id: '2', name: 'Williamsburg', city: 'Brooklyn',   state: 'NY', createdAt: new Date(), messages: [] },
  { id: '3', name: 'Silver Lake',  city: 'Los Angeles',state: 'CA', createdAt: new Date(), messages: [] },
];

function NewAreaModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (name: string, city: string, state: string) => void;
}) {
  const [name,  setName]  = useState('');
  const [city,  setCity]  = useState('');
  const [state, setState] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && city.trim()) onCreate(name.trim(), city.trim(), state.trim());
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-[#FDF8F5] border border-[#F0D5C5] rounded-xl flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 13 13" fill="none">
              <circle cx="6.5" cy="5.5" r="2.5" stroke="#D4622A" strokeWidth="1.2" />
              <path d="M6.5 1C4.015 1 2 3.015 2 5.5c0 3.5 4.5 6.5 4.5 6.5s4.5-3 4.5-6.5C11 3.015 8.985 1 6.5 1z" stroke="#D4622A" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h2 className="text-[16px] font-semibold text-[#1A1A1A]">Add new area</h2>
            <p className="text-[12px] text-[#9B8F84]">Search any neighborhood or city</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-[#6B6B6B] mb-1.5">Neighborhood / Area name</label>
            <input autoFocus type="text" placeholder="e.g. Hyde Park, Williamsburg, The Mission" value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-[#E8E4DC] rounded-xl text-[14px] text-[#1A1A1A] placeholder-[#B0A89E] outline-none focus:border-[#D4622A] transition-colors" />
          </div>
          <div className="flex gap-2.5">
            <div className="flex-1">
              <label className="block text-[12px] font-medium text-[#6B6B6B] mb-1.5">City</label>
              <input type="text" placeholder="Cincinnati" value={city} onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[#E8E4DC] rounded-xl text-[14px] text-[#1A1A1A] placeholder-[#B0A89E] outline-none focus:border-[#D4622A] transition-colors" />
            </div>
            <div className="w-20">
              <label className="block text-[12px] font-medium text-[#6B6B6B] mb-1.5">State</label>
              <input type="text" placeholder="OH" value={state}
                onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                className="w-full px-3.5 py-2.5 border border-[#E8E4DC] rounded-xl text-[14px] text-[#1A1A1A] placeholder-[#B0A89E] outline-none focus:border-[#D4622A] transition-colors" />
            </div>
          </div>
          <div className="flex gap-2.5 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-[#E8E4DC] rounded-xl text-[14px] font-medium text-[#6B6B6B] hover:bg-[#F7F5F1] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!name.trim() || !city.trim()}
              className="flex-1 px-4 py-2.5 bg-[#D4622A] rounded-xl text-[14px] font-semibold text-white hover:bg-[#C0561F] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              Start researching
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── SSE parser ────────────────────────────────────────────────────────────
function parseSseChunk(chunk: string): { event: string; data: unknown }[] {
  const results: { event: string; data: unknown }[] = [];
  const blocks = chunk.split('\n\n');
  for (const block of blocks) {
    if (!block.trim()) continue;
    let event = 'message';
    let dataStr = '';
    for (const line of block.split('\n')) {
      if (line.startsWith('event: ')) event = line.slice(7).trim();
      if (line.startsWith('data: '))  dataStr = line.slice(6).trim();
    }
    if (dataStr) {
      try { results.push({ event, data: JSON.parse(dataStr) }); } catch { /* skip */ }
    }
  }
  return results;
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function Home() {
  const [areas,           setAreas]           = useState<Area[]>(DEMO_AREAS);
  const [activeAreaId,    setActiveAreaId]     = useState<string | null>(DEMO_AREAS[0].id);
  const [messagesByArea,  setMessagesByArea]   = useState<Record<string, Message[]>>({});
  const [inputValue,      setInputValue]       = useState('');
  const [isLoading,       setIsLoading]        = useState(false);
  const [activeAgents,    setActiveAgents]     = useState<AgentRun[]>([]);
  const [statusMsg,       setStatusMsg]        = useState<string | null>(null);
  const [showNewAreaModal,setShowNewAreaModal] = useState(false);

  const activeArea = areas.find((a) => a.id === activeAreaId) ?? null;
  const messages   = activeAreaId ? (messagesByArea[activeAreaId] ?? []) : [];

  const addMessage = useCallback((areaId: string, msg: Message) => {
    setMessagesByArea((prev) => ({ ...prev, [areaId]: [...(prev[areaId] ?? []), msg] }));
  }, []);

  const updateAgent = useCallback((agent: AgentName, status: AgentRun['status']) => {
    setActiveAgents((prev) => {
      const existing = prev.find((a) => a.agent === agent);
      if (existing) return prev.map((a) => a.agent === agent ? { ...a, status } : a);
      return [...prev, { agent, status }];
    });
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;
    const areaId = activeAreaId;
    if (!areaId) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    addMessage(areaId, userMsg);
    setInputValue('');
    setIsLoading(true);
    setActiveAgents([]);
    setStatusMsg('Analyzing your question...');

    const textarea = document.querySelector('textarea');
    if (textarea) textarea.style.height = 'auto';

    try {
      const currentMessages = [...(messagesByArea[areaId] ?? []), userMsg];
      const area = areas.find((a) => a.id === areaId);
      const areaContext = area ? `${area.name}, ${area.city}, ${area.state}` : undefined;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessages.map((m) => ({ role: m.role, content: m.content })),
          areaContext,
        }),
      });

      if (!res.body) throw new Error('No response body');
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE blocks are separated by double newlines
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() ?? '';

        for (const block of blocks) {
          const events = parseSseChunk(block + '\n\n');
          for (const { event, data } of events) {
            const d = data as Record<string, unknown>;
            switch (event) {
              case 'status':
                setStatusMsg(d.message as string);
                break;
              case 'routing':
                // Pre-populate all selected agents as pending
                setActiveAgents((d.agents as AgentName[]).map((a) => ({ agent: a, status: 'pending' as const })));
                setStatusMsg(null);
                break;
              case 'agent':
                updateAgent(d.agent as AgentName, d.status as AgentRun['status']);
                break;
              case 'response':
                addMessage(areaId, {
                  id: (Date.now() + 1).toString(),
                  role: 'assistant',
                  content: d.content as string,
                  timestamp: new Date(),
                  agentRun: activeAgents,
                });
                break;
              case 'error':
                addMessage(areaId, {
                  id: (Date.now() + 1).toString(),
                  role: 'assistant',
                  content: `Sorry, something went wrong: ${d.message}`,
                  timestamp: new Date(),
                });
                break;
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      addMessage(areaId, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Couldn't reach the server. Check that `.env.local` is set up and the server is running.",
        timestamp: new Date(),
      });
    } finally {
      setIsLoading(false);
      setActiveAgents([]);
      setStatusMsg(null);
    }
  }, [activeAreaId, areas, messagesByArea, isLoading, addMessage, updateAgent, activeAgents]);

  const handleCreateArea = (name: string, city: string, state: string) => {
    const newArea: Area = { id: Date.now().toString(), name, city, state, createdAt: new Date(), messages: [] };
    setAreas((prev) => [newArea, ...prev]);
    setActiveAreaId(newArea.id);
    setShowNewAreaModal(false);
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Sidebar
        areas={areas}
        activeAreaId={activeAreaId}
        onSelectArea={(id) => { setActiveAreaId(id); setInputValue(''); }}
        onNewArea={() => setShowNewAreaModal(true)}
      />
      <ChatArea
        area={activeArea}
        messages={messages}
        isLoading={isLoading}
        activeAgents={activeAgents}
        statusMsg={statusMsg}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSend={() => sendMessage(inputValue)}
        onSelectPrompt={(p) => sendMessage(p)}
        onNewArea={() => setShowNewAreaModal(true)}
      />
      {showNewAreaModal && (
        <NewAreaModal onClose={() => setShowNewAreaModal(false)} onCreate={handleCreateArea} />
      )}
    </div>
  );
}
