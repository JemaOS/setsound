import React, { useState, useEffect } from 'react';

const API_BASE = 'https://test-connect-api.jematech.fr';
const API_KEY = 'e58492a3-b452-4197-9f4a-deb7915b9446';

declare global {
  interface Window {
    getJemaOSToken?: () => Promise<string | null>;
    jemaosToken?: string;
  }
}

function getTokenFromCookie(): string | null {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'jemaos_access_token' && value) {
      return value;
    }
  }
  return null;
}

async function getAccessToken(): Promise<string | null> {
  const cookieToken = getTokenFromCookie();
  if (cookieToken) return cookieToken;
  if (window.getJemaOSToken) {
    try {
      return await window.getJemaOSToken();
    } catch {
      return null;
    }
  }
  if (window.jemaosToken) {
    return window.jemaosToken;
  }
  try {
    const sessionToken = sessionStorage.getItem('jemaos_access_token');
    if (sessionToken) return sessionToken;
  } catch {}
  return null;
}

async function checkSubscription(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/v1/connect/os/subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.hasSubscription === true;
  } catch {
    return false;
  }
}

function JemaOSLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
      <img
        src="/logo-jema-black.png"
        alt="JEMA"
        style={{ height: '38px', width: 'auto', display: 'block' }}
      />
      <img
        src="/logo-jema-os-hero.png"
        alt="OS"
        style={{ height: '38px', width: 'auto', display: 'block' }}
      />
    </div>
  );
}

function LockIcon() {
  return (
    <div style={{
      width: '72px',
      height: '72px',
      borderRadius: '50%',
      background: 'rgba(79, 70, 229, 0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 1.5rem',
    }}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#4f46e5"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="5" y="11" width="14" height="10" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </div>
  );
}

function UpgradeScreen({ appName }: { appName: string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #0b0f1a 0%, #151b2b 50%, #1a1f35 100%)',
      color: '#0f172a',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      textAlign: 'center',
      padding: '1rem',
      boxSizing: 'border-box',
      overflow: 'auto',
    }}>
      <div style={{
        flex: '1 0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        padding: '1rem 0',
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.96)',
          borderRadius: '28px',
          padding: '2rem 2rem',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}>
          <div style={{ marginBottom: '2rem' }}>
            <JemaOSLogo />
          </div>
          <LockIcon />
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            margin: '0 0 0.75rem',
            letterSpacing: '-0.02em',
            color: '#0f172a',
          }}>
            {appName}
          </h1>
          <p style={{
            fontSize: '1rem',
            color: '#475569',
            margin: '0 0 2rem',
            lineHeight: 1.6,
          }}>
            Cette application nécessite un abonnement JemaOS Pro.
          </p>
          <a
            href="https://www.jemaos.com/tarifs"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#fff',
              padding: '0.875rem 2.5rem',
              borderRadius: '9999px',
              textDecoration: 'none',
              fontSize: '1rem',
              fontWeight: 600,
              boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.45)',
            }}
          >
            Passer à Pro
          </a>
        </div>
      </div>
      <div style={{
        flexShrink: 0,
        textAlign: 'center',
        padding: '0.75rem 0',
        fontSize: '0.8rem',
        color: 'rgba(255, 255, 255, 0.45)',
      }}>
        © Jema Technology 2026
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#0b0f1a',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ fontSize: '1.2rem' }}>Chargement…</div>
    </div>
  );
}

interface SubscriptionGuardProps {
  appName: string;
  children: React.ReactNode;
}

export const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({ appName, children }) => {
  const [status, setStatus] = useState<'loading' | 'allowed' | 'denied'>('loading');

  useEffect(() => {
    let cancelled = false;
    const verify = async () => {
      const token = await getAccessToken();
      if (!token) { if (!cancelled) setStatus('denied'); return; }
      const allowed = await checkSubscription(token);
      if (!cancelled) setStatus(allowed ? 'allowed' : 'denied');
    };
    verify();
    const interval = setInterval(verify, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (status === 'loading') return <LoadingScreen />;
  if (status === 'denied') return <UpgradeScreen appName={appName} />;
  return <>{children}</>;
};

export default SubscriptionGuard;
