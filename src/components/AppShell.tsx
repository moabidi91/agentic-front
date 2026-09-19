import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBranding } from '../branding/BrandingProvider';
import { BrandIcon } from '../branding/icons';
import { UserMenu } from './UserMenu';

export function AppShell({
  tabs,
  children,
}: {
  /** Optional Chat/Debug-style tab switcher rendered in the top bar, center. */
  tabs?: ReactNode;
  children: ReactNode;
}) {
  const { branding } = useBranding();
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <header
        style={{
          height: 56,
          flexShrink: 0,
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
        }}
      >
        <button
          onClick={() => navigate('/chat')}
          style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none' }}
        >
          <BrandIcon id={branding.iconId} primary="var(--navy)" accent="var(--blue)" size={22} />
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.04em', color: 'var(--text)' }}>{branding.appName}</span>
            <span
              style={{
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: '0.08em',
                padding: '1px 6px',
                borderRadius: 4,
                background: 'var(--blue)22',
                color: 'var(--blue)',
              }}
            >
              {branding.appLabel}
            </span>
          </span>
        </button>

        {tabs}

        <UserMenu />
      </header>

      <main style={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{children}</main>
    </div>
  );
}
