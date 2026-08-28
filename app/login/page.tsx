'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const FONT = "var(--font-inter), 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif";

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: -0.5, color: '#2E5E37', lineHeight: 1 }}>Rent</span>
      <span style={{ fontWeight: 500, fontSize: 22, letterSpacing: -0.5, color: '#2E5E37', lineHeight: 1 }}>Signal</span>
    </div>
  );
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
    <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
  </svg>
);

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/chat');
    }
  }, [status, router]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    await signIn('google', { callbackUrl: '/chat' });
  };

  if (status === 'loading' || session) return null;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg, #F0FDF4 0%, #FBFAF6 50%, #F0F4FF 100%)',
      fontFamily: FONT,
    }}>
      {/* Card */}
      <div style={{
        background: 'white',
        borderRadius: 20,
        border: '1px solid #E8F5E9',
        boxShadow: '0 4px 6px -2px rgba(0,0,0,0.05), 0 20px 50px -12px rgba(31,122,31,0.12)',
        padding: '40px 44px',
        width: '100%',
        maxWidth: 420,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0,
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 28 }}>
          <Logo />
        </div>

        {/* Headline */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{
            fontSize: 24, fontWeight: 700, color: '#0F172A',
            letterSpacing: -0.5, margin: '0 0 8px',
          }}>
            Sign in to your account
          </h1>
          <p style={{ fontSize: 14, color: '#64748B', margin: 0, lineHeight: 1.6 }}>
            AI-powered rental research for smarter<br />investment decisions.
          </p>
        </div>

        {/* Google button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            height: 48, padding: '0 20px',
            background: loading ? '#F8FAFC' : 'white',
            border: '1px solid #E2E8F0',
            borderRadius: 12,
            fontSize: 15, fontWeight: 600, color: '#0F172A',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            transition: 'all 0.15s ease',
            fontFamily: FONT,
            opacity: loading ? 0.7 : 1,
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.borderColor = '#CBD5E1'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
        >
          {loading ? (
            <svg width="18" height="18" viewBox="0 0 18 18" style={{ animation: 'spin 0.8s linear infinite' }}>
              <circle cx="9" cy="9" r="7" stroke="#CBD5E1" strokeWidth="2" fill="none" />
              <path d="M9 2a7 7 0 017 7" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" fill="none" />
            </svg>
          ) : (
            <GoogleIcon />
          )}
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div style={{ width: '100%', margin: '24px 0 0', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: 0, lineHeight: 1.6 }}>
            By signing in, you agree to our{' '}
            <span style={{ color: '#16A34A', cursor: 'pointer', fontWeight: 500 }}>Terms of Service</span>
            {' '}and{' '}
            <span style={{ color: '#16A34A', cursor: 'pointer', fontWeight: 500 }}>Privacy Policy</span>.
          </p>
        </div>
      </div>

      {/* Feature pills */}
      <div style={{ display: 'flex', gap: 10, marginTop: 28, flexWrap: 'wrap', justifyContent: 'center' }}>
        {['Live Zillow data', 'Reddit sentiment', 'AI rent analysis'].map(f => (
          <span key={f} style={{
            fontSize: 12, fontWeight: 500, color: '#16A34A',
            background: 'rgba(255,255,255,0.8)', border: '1px solid #BBF7D0',
            padding: '5px 12px', borderRadius: 999,
          }}>{f}</span>
        ))}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
