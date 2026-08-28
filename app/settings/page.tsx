'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { loadUserData } from '@/lib/storage';
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
};

const FONT = "var(--font-inter), 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif";

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

function Logo() {
  return (
    <Link href="/chat" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
      <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.3, color: '#2E5E37', lineHeight: 1 }}>Rent</span>
      <span style={{ fontWeight: 500, fontSize: 18, letterSpacing: -0.3, color: '#2E5E37', lineHeight: 1 }}>Signal</span>
    </Link>
  );
}

const iconBtnBase: React.CSSProperties = {
  width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer',
};

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 36, height: 20, borderRadius: 999,
        background: value ? A.brand : '#D0CCC4',
        border: 'none', cursor: 'pointer', position: 'relative',
        transition: 'background 0.18s ease', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 2,
        left: value ? 18 : 2,
        width: 16, height: 16, borderRadius: 999,
        background: 'white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'left 0.18s ease',
        display: 'block',
      }} />
    </button>
  );
}

function DataSourceRow({ name, description, connected, onChange, last }: {
  name: string; description: string; connected: boolean; onChange: (v: boolean) => void; last?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '14px 0',
      borderBottom: last ? 'none' : `1px solid ${A.hairSoft}`,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: A.ink, fontFamily: FONT }}>{name}</div>
        <div style={{ fontSize: 12, color: A.mute, marginTop: 2, fontFamily: FONT }}>{description}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: connected ? A.brand : A.faint, fontFamily: FONT }}>
          {connected ? 'Connected' : 'Not connected'}
        </span>
        <Toggle value={connected} onChange={onChange} />
      </div>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, color: A.faint,
      letterSpacing: '0.07em', textTransform: 'uppercase' as const,
      marginBottom: 4, marginTop: 28, fontFamily: FONT,
    }}>{children}</div>
  );
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#FFFFFF',
      border: `1px solid ${A.hair}`,
      borderRadius: 14,
      padding: '0 20px',
      marginTop: 10,
    }}>{children}</div>
  );
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user;
  const initial = user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? 'U';

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [areas, setAreas] = useState<Area[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messagesByConv, setMessagesByConv] = useState<Record<string, Message[]>>({});

  const [sources, setSources] = useState({
    zillow: true,
    reddit: true,
    yelp: true,
    googleMaps: false,
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (user?.email) {
      const data = loadUserData(user.email);
      if (data) {
        setAreas(data.areas);
        setConversations(data.conversations);
        setMessagesByConv(data.messagesByConv);
      }
    }
  }, [user?.email]);

  if (status === 'loading' || !session) return null;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden',
      fontFamily: FONT, color: A.ink, background: A.canvas,
    }}>
      {/* Top nav */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 16px', height: 42, background: 'white',
        borderBottom: '1px solid #E2E8F0', flexShrink: 0,
      }}>
        <button
          className="btn-icon"
          onClick={() => setSidebarCollapsed(v => !v)}
          title={sidebarCollapsed ? 'Show sidebar' : 'Collapse sidebar'}
          style={iconBtnBase}
        >
          <IconPanelLeft active={!sidebarCollapsed} />
        </button>
        <div style={{ marginRight: 'auto' }}><Logo /></div>
        <button className="btn-icon" style={{ ...iconBtnBase, opacity: 0.5 }} title="Settings (current page)">
          <IconGear />
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Sidebar */}
        <div style={{
          width: sidebarCollapsed ? 56 : 264,
          transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden', flexShrink: 0,
        }}>
          <Sidebar
            areas={areas}
            activeAreaId={null}
            conversations={conversations}
            activeConvId={null}
            messagesByConv={messagesByConv}
            onSelectArea={() => router.push('/chat')}
            onSelectConv={() => router.push('/chat')}
            onDeleteConv={() => {}}
            onNewChat={() => router.push('/chat')}
            collapsed={sidebarCollapsed}
            onCollapse={() => setSidebarCollapsed(true)}
            onExpand={() => setSidebarCollapsed(false)}
          />
        </div>

        {/* Main content */}
        <main style={{ flex: 1, overflow: 'auto', background: A.canvas }}>
          <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 40px' }}>

            <h1 style={{ fontSize: 24, fontWeight: 700, color: A.ink, margin: '0 0 4px', letterSpacing: '-0.02em', fontFamily: FONT }}>
              Settings
            </h1>
            <p style={{ fontSize: 14, color: A.mute, margin: 0, fontFamily: FONT }}>
              Manage your account and connected data sources.
            </p>

            <SectionHeader>Account</SectionHeader>
            <SettingsCard>
              <div style={{ padding: '20px 0 16px', borderBottom: `1px solid ${A.hairSoft}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.image} alt={user.name ?? ''} referrerPolicy="no-referrer"
                      style={{ width: 56, height: 56, borderRadius: 999, objectFit: 'cover', border: `2px solid ${A.hair}` }} />
                  ) : (
                    <div style={{
                      width: 56, height: 56, borderRadius: 999, flexShrink: 0,
                      background: `linear-gradient(135deg, ${A.brand}, ${A.brandDeep})`,
                      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 20, fontFamily: FONT,
                    }}>{initial}</div>
                  )}
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: A.ink, fontFamily: FONT }}>{user?.name ?? '—'}</div>
                    <div style={{ fontSize: 13, color: A.mute, marginTop: 2, fontFamily: FONT }}>{user?.email ?? '—'}</div>
                  </div>
                </div>
              </div>
              <div style={{ padding: '16px 0' }}>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  style={{
                    padding: '8px 16px', fontSize: 13, fontWeight: 600,
                    border: `1px solid ${A.hair}`, borderRadius: 8,
                    background: 'white', color: A.mute, cursor: 'pointer', fontFamily: FONT,
                  }}
                >
                  Sign out
                </button>
              </div>
            </SettingsCard>

            <SectionHeader>Connected Data Sources</SectionHeader>
            <SettingsCard>
              <DataSourceRow
                name="Zillow" description="Live rental listings and market data"
                connected={sources.zillow} onChange={v => setSources(s => ({ ...s, zillow: v }))}
              />
              <DataSourceRow
                name="Reddit" description="Community sentiment and neighborhood reviews"
                connected={sources.reddit} onChange={v => setSources(s => ({ ...s, reddit: v }))}
              />
              <DataSourceRow
                name="Yelp" description="Local business and neighborhood quality signals"
                connected={sources.yelp} onChange={v => setSources(s => ({ ...s, yelp: v }))}
              />
              <DataSourceRow
                name="Google Maps" description="Map data and commute time estimates"
                connected={sources.googleMaps} onChange={v => setSources(s => ({ ...s, googleMaps: v }))}
                last
              />
            </SettingsCard>

            <div style={{ marginTop: 32 }}>
              <Link href="/chat" style={{ fontSize: 13, color: A.mute, textDecoration: 'none', fontFamily: FONT }}>
                ← Back to chat
              </Link>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
