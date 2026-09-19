import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBranding } from '../branding/BrandingProvider';
import { BrandIcon } from '../branding/icons';
import { useTheme } from '../theme/ThemeProvider';
import { UserMenu } from './UserMenu';

/** Chat-specific header info (session block, working-folder pill, phase pill, reset) — see ChatScreen. */
export interface ChatHeaderInfo {
  sessionCode: string;
  userLine: string;
  workingSpace?: string;
  phaseLabel: string;
  /** `paused` is the 401 pause of ADR-025: not working, not idle — waiting on the user. */
  phaseKind: 'processing' | 'interrupted' | 'paused' | 'idle';
  onPhaseClick?: () => void;
  onReset?: () => void;
}

function ThemeToggleButton() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        width: 32,
        height: 32,
        flexShrink: 0,
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'var(--surface-2)',
        color: 'var(--text-2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {isDark ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      )}
    </button>
  );
}

function VerticalDivider() {
  return <span style={{ width: 1, height: 24, background: 'var(--border)', flexShrink: 0 }} />;
}

function FolderPill({ path }: { path?: string }) {
  const display = path && path.trim() ? path : 'no working folder';
  return (
    <span
      title={path || 'No working folder set for this session'}
      style={{
        height: 32,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 10px',
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'var(--surface-2)',
        maxWidth: 230,
        boxSizing: 'border-box',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth={1.8} style={{ flexShrink: 0 }}>
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
      </svg>
      <span
        style={{
          fontSize: 12,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-2)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {display}
      </span>
    </span>
  );
}

const PHASE_TONE: Record<ChatHeaderInfo['phaseKind'], { bg: string; fg: string; pulse: boolean }> = {
  processing: { bg: 'var(--amber-soft)', fg: 'var(--amber)', pulse: true },
  interrupted: { bg: 'var(--surface-2)', fg: 'var(--text-2)', pulse: false },
  paused: { bg: 'var(--amber-soft)', fg: 'var(--amber)', pulse: false },
  idle: { bg: 'var(--green-soft)', fg: 'var(--green)', pulse: false },
};

function PhasePill({ info }: { info: ChatHeaderInfo }) {
  const tone = PHASE_TONE[info.phaseKind];
  return (
    <button
      onClick={info.onPhaseClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '6px 12px',
        borderRadius: 999,
        border: 'none',
        background: tone.bg,
        color: tone.fg,
        fontSize: 11.5,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      <span
        className={tone.pulse ? 'af-pulse-dot' : undefined}
        style={{ width: 6, height: 6, borderRadius: '50%', background: tone.fg, flexShrink: 0 }}
      />
      {info.phaseLabel}
    </button>
  );
}

function ResetButton({ onReset }: { onReset?: () => void }) {
  return (
    <button
      onClick={onReset}
      aria-label="Reset / interrupt session"
      title="Reset / interrupt session"
      style={{
        width: 32,
        height: 32,
        flexShrink: 0,
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'var(--surface-2)',
        color: 'var(--text-2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
      </svg>
    </button>
  );
}

export function AppShell({
  tabs,
  chatHeader,
  children,
}: {
  /** Optional Chat/Debug-style tab switcher rendered in the top bar, center. */
  tabs?: ReactNode;
  /** Chat-screen-only header pieces (session block, working folder, phase, reset) — see ChatScreen. */
  chatHeader?: ChatHeaderInfo;
  children: ReactNode;
}) {
  const { branding } = useBranding();
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <header
        style={{
          height: 64,
          flexShrink: 0,
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '0 22px',
        }}
      >
        <button
          onClick={() => navigate('/chat')}
          style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', flexShrink: 0 }}
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

        {chatHeader && (
          <>
            <VerticalDivider />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Session #{chatHeader.sessionCode}</span>
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>{chatHeader.userLine}</span>
            </div>
            <FolderPill path={chatHeader.workingSpace} />
          </>
        )}

        <div style={{ flexGrow: 1 }} />

        {chatHeader && (
          <>
            <PhasePill info={chatHeader} />
            <ResetButton onReset={chatHeader.onReset} />
          </>
        )}

        {tabs}

        <ThemeToggleButton />
        <UserMenu />
      </header>

      <main style={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{children}</main>
    </div>
  );
}
