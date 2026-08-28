'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { Area, Conversation, Message } from '@/lib/types';

const A = {
  canvas: '#FBFAF6',
  ink: '#1A1916',
  mute: '#75736A',
  faint: '#A6A39A',
  hair: '#EBE7DC',
  hairSoft: '#F1EDE2',
  brand: '#3F7D4A',
  brandDeep: '#2E5E37',
  brandSoft: '#EEF3E9',
  brandSoftBorder: '#DDE8D2',
};

const FONT = "var(--font-inter), 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif";

interface SidebarProps {
  areas: Area[];
  activeAreaId: string | null;
  conversations: Conversation[];
  activeConvId: string | null;
  messagesByConv: Record<string, Message[]>;
  onSelectArea: (id: string) => void;
  onSelectConv: (id: string) => void;
  onDeleteConv: (id: string) => void;
  onNewChat: () => void;
  collapsed: boolean;
  onCollapse: () => void;
  onExpand: () => void;
}

const IconPlus = () => (
  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
    <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const IconChevronLeft = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M9 3L5 7l4 4" stroke={A.faint} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M5 3l4 4-4 4" stroke={A.brandDeep} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconX = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const IconSearch = () => (
  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
    <circle cx="6" cy="6" r="4.5" stroke={A.faint} strokeWidth="1.5" />
    <path d="M10 10l2.5 2.5" stroke={A.faint} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const IconSettings = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="2" stroke={A.faint} strokeWidth="1.4" />
    <path d="M8 2v1.5M8 12.5V14M14 8h-1.5M3.5 8H2M12.2 3.8l-1 1M4.8 11.2l-1 1M12.2 12.2l-1-1M4.8 4.8l-1-1" stroke={A.faint} strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);
const IconLogout = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
    <path d="M10 2H3v12h7M7 8h8m0 0l-3-3m3 3l-3 3" stroke={A.faint} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, color: A.faint,
      letterSpacing: '0.07em', textTransform: 'uppercase' as const,
      padding: '4px 8px 3px',
    }}>{children}</div>
  );
}

function ChatItem({ title, time, active, onClick, onDelete }: {
  title: string; time?: string; active: boolean; onClick: () => void; onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 10px', marginBottom: 1,
        background: active ? 'rgba(63,125,74,.08)' : hovered ? 'rgba(0,0,0,.03)' : 'transparent',
        border: 'none', borderRadius: 7, cursor: 'pointer',
        position: 'relative', fontFamily: FONT,
        transition: 'background-color 0.12s ease',
      }}
    >
      {active && (
        <span style={{
          position: 'absolute', left: 0, top: 7, bottom: 7,
          width: 2, background: A.brand, borderRadius: 2,
        }} />
      )}
      <span style={{
        flex: 1, fontSize: 12.5, fontWeight: active ? 600 : 500,
        color: active ? A.ink : A.mute,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        textAlign: 'left',
      }}>{title}</span>
      {hovered ? (
        <span
          role="button"
          onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{
            width: 18, height: 18, borderRadius: 4, flexShrink: 0,
            background: 'rgba(0,0,0,0.08)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: A.mute,
          }}
        >
          <IconX />
        </span>
      ) : (
        time && <span style={{ fontSize: 10, color: A.faint, flexShrink: 0 }}>{time}</span>
      )}
    </button>
  );
}

function AreaItem({ id, name, city, active, onClick }: {
  id: string; name: string; city: string; active: boolean; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 10px', marginBottom: 1,
        background: active ? 'rgba(63,125,74,.08)' : hovered ? 'rgba(0,0,0,.03)' : 'transparent',
        border: 'none', borderRadius: 7, cursor: 'pointer', textAlign: 'left', fontFamily: FONT,
        transition: 'background-color 0.12s ease',
      }}
    >
      <span style={{
        width: 5, height: 5, borderRadius: 999, flexShrink: 0,
        background: active ? A.brand : '#D0CCC4',
      }} />
      <span style={{
        flex: 1, fontSize: 12.5, fontWeight: active ? 600 : 500,
        color: active ? A.ink : A.mute,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{name}</span>
      <span style={{ fontSize: 10.5, color: A.faint, flexShrink: 0 }}>{city}</span>
    </button>
  );
}

function getTimeLabel(date: Date): string {
  const h = (Date.now() - date.getTime()) / 3600000;
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${Math.round(h)}h`;
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
}

function ExpandedSidebar({ areas, activeAreaId, conversations, activeConvId, messagesByConv, onSelectArea, onSelectConv, onDeleteConv, onNewChat, onCollapse }: Omit<SidebarProps, 'collapsed' | 'onExpand'>) {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user;
  const initial = user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? 'U';

  const [searchQuery, setSearchQuery] = useState('');
  const [profileHovered, setProfileHovered] = useState(false);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(c => {
      if (c.title.toLowerCase().includes(q)) return true;
      return (messagesByConv[c.id] ?? []).some(m => m.content.toLowerCase().includes(q));
    });
  }, [searchQuery, conversations, messagesByConv]);

  const today = filteredConversations.filter(c => (Date.now() - c.createdAt.getTime()) / 3600000 < 24);
  const thisWeek = filteredConversations.filter(c => {
    const h = (Date.now() - c.createdAt.getTime()) / 3600000;
    return h >= 24 && h < 168;
  });

  return (
    <aside style={{
      width: '100%', flexShrink: 0, background: A.canvas,
      borderRight: `1px solid ${A.hair}`,
      display: 'flex', flexDirection: 'column', height: '100%',
      padding: '12px 6px 10px', fontFamily: FONT,
    }}>
      {/* New chat */}
      <button onClick={onNewChat} style={{
        margin: '0 2px 8px', display: 'flex', alignItems: 'center', gap: 8,
        height: 34, padding: '0 12px',
        background: 'transparent', color: A.mute,
        border: `1px solid ${A.hair}`,
        borderRadius: 8, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: FONT,
      }}>
        <IconPlus /> New chat
      </button>

      {/* Search input */}
      <div style={{ margin: '0 2px 8px', position: 'relative', display: 'flex', alignItems: 'center' }}>
        <span style={{ position: 'absolute', left: 9, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
          <IconSearch />
        </span>
        <input
          type="text"
          placeholder="Search chats…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onFocus={e => { e.target.style.background = 'white'; e.target.style.borderColor = A.brandSoftBorder; }}
          onBlur={e => { e.target.style.background = 'rgba(0,0,0,0.04)'; e.target.style.borderColor = 'transparent'; }}
          style={{
            width: '100%', height: 30, padding: '0 28px 0 28px',
            fontSize: 12, color: A.ink,
            background: 'rgba(0,0,0,0.04)',
            border: '1px solid transparent',
            borderRadius: 7, outline: 'none', fontFamily: FONT,
            transition: 'background 0.12s, border-color 0.12s',
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute', right: 6,
              width: 16, height: 16, borderRadius: 4,
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: A.faint, padding: 0,
            }}
          >
            <IconX />
          </button>
        )}
      </div>

      {/* Conversation list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 2px' }}>
        {searchQuery && filteredConversations.length === 0 && (
          <div style={{ padding: '16px 8px', textAlign: 'center', fontSize: 12, color: A.faint }}>
            No chats match &ldquo;{searchQuery}&rdquo;
          </div>
        )}
        {today.length > 0 && (
          <>
            <SectionLabel>Today</SectionLabel>
            {today.map(c => (
              <ChatItem
                key={c.id} title={c.title}
                time={getTimeLabel(c.createdAt)}
                active={c.id === activeConvId}
                onClick={() => onSelectConv(c.id)}
                onDelete={() => onDeleteConv(c.id)}
              />
            ))}
            <div style={{ height: 8 }} />
          </>
        )}
        {thisWeek.length > 0 && (
          <>
            <SectionLabel>This week</SectionLabel>
            {thisWeek.map(c => (
              <ChatItem
                key={c.id} title={c.title}
                time={getTimeLabel(c.createdAt)}
                active={c.id === activeConvId}
                onClick={() => onSelectConv(c.id)}
                onDelete={() => onDeleteConv(c.id)}
              />
            ))}
            <div style={{ height: 8 }} />
          </>
        )}

        <SectionLabel>Areas</SectionLabel>
        {areas.map(a => (
          <AreaItem
            key={a.id} id={a.id} name={a.name} city={a.city}
            active={a.id === activeAreaId}
            onClick={() => onSelectArea(a.id)}
          />
        ))}
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${A.hairSoft}`, marginTop: 6, paddingTop: 6 }}>
        {/* Profile row → settings */}
        <button
          onClick={() => router.push('/settings')}
          onMouseEnter={() => setProfileHovered(true)}
          onMouseLeave={() => setProfileHovered(false)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 8px 5px 6px', borderRadius: 7,
            background: profileHovered ? 'rgba(0,0,0,0.04)' : 'transparent',
            border: 'none', cursor: 'pointer', fontFamily: FONT,
            transition: 'background 0.12s',
          }}
        >
          {user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt={user.name ?? ''} referrerPolicy="no-referrer"
              style={{ width: 26, height: 26, borderRadius: 999, flexShrink: 0, objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: 26, height: 26, borderRadius: 999, flexShrink: 0,
              background: `linear-gradient(135deg, ${A.brand}, ${A.brandDeep})`,
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 10,
            }}>{initial}</div>
          )}
          <span style={{
            flex: 1, fontSize: 12, color: A.mute, textAlign: 'left',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {user?.name ?? user?.email ?? 'Account'}
          </span>
        </button>

        {/* Sub-row: settings, sign-out, collapse */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, paddingTop: 2, paddingRight: 2 }}>
          <button
            onClick={() => router.push('/settings')}
            title="Settings"
            style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            <IconSettings />
          </button>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            title="Sign out"
            style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            <IconLogout />
          </button>
          <button onClick={onCollapse} title="Collapse" style={{
            width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', flexShrink: 0,
          }}>
            <IconChevronLeft />
          </button>
        </div>
      </div>
    </aside>
  );
}

function CollapsedRail({ areas, activeAreaId, onSelectArea, onNewChat, onExpand }: {
  areas: Area[]; activeAreaId: string | null;
  onSelectArea: (id: string) => void; onNewChat: () => void; onExpand: () => void;
}) {
  return (
    <aside style={{
      width: 48, flexShrink: 0, background: A.canvas,
      borderRight: `1px solid ${A.hair}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '12px 0 10px', gap: 4,
    }}>
      <button title="New chat" onClick={onNewChat} style={{
        width: 32, height: 32, borderRadius: 8,
        background: 'transparent', border: `1px solid ${A.hair}`, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: A.mute,
      }}>
        <IconPlus />
      </button>
      <div style={{ width: 20, height: 1, background: A.hair, margin: '4px 0' }} />
      {areas.map(a => (
        <button
          key={a.id} title={`${a.name}, ${a.city}`}
          onClick={() => onSelectArea(a.id)}
          style={{
            width: 32, height: 32, borderRadius: 8,
            background: a.id === activeAreaId ? A.brandSoft : 'transparent',
            color: a.id === activeAreaId ? A.brandDeep : A.mute,
            border: a.id === activeAreaId ? `1px solid ${A.brandSoftBorder}` : '1px solid transparent',
            cursor: 'pointer', fontSize: 10, fontWeight: 700, fontFamily: FONT,
          }}
        >
          {a.name.slice(0, 2).toUpperCase()}
        </button>
      ))}
      <div style={{ flex: 1 }} />
      <button onClick={onExpand} title="Expand" style={{
        width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer',
      }}>
        <IconChevronRight />
      </button>
    </aside>
  );
}

export default function Sidebar(props: SidebarProps) {
  if (props.collapsed) {
    return (
      <CollapsedRail
        areas={props.areas}
        activeAreaId={props.activeAreaId}
        onSelectArea={props.onSelectArea}
        onNewChat={props.onNewChat}
        onExpand={props.onExpand}
      />
    );
  }
  return <ExpandedSidebar {...props} />;
}
