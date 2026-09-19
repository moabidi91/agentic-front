import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell, type ChatHeaderInfo } from './AppShell';
import { useApi } from '../api/context';
import { useSession } from '../session/SessionContext';
import type { HistorySession } from '../api/types';
import { Badge } from './Badge';
import { conversationTone, toneColors } from './statusColors';

export type SessionTab = 'chat' | 'debug' | 'history';

function ChatDebugTabs({ active }: { active: SessionTab }) {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', borderRadius: 999, padding: 3 }}>
      {(['chat', 'debug', 'history'] as const).map((tab) => (
        <button
          key={tab}
          onClick={() => navigate(`/${tab}`)}
          className="af-btn af-btn--sm"
          style={{
            background: active === tab ? 'var(--surface)' : 'transparent',
            color: active === tab ? 'var(--text)' : 'var(--text-3)',
            boxShadow: active === tab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            textTransform: 'capitalize',
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

export function SessionShell({
  active,
  chatHeader,
  children,
}: {
  active: SessionTab;
  /** Chat-only header pieces (session block, working folder, phase, reset) — see ChatScreen. */
  chatHeader?: ChatHeaderInfo;
  children: ReactNode;
}) {
  const api = useApi();
  const { connection } = useSession();
  const [sessions, setSessions] = useState<HistorySession[]>([]);

  useEffect(() => {
    api.listHistorySessions().then(setSessions);
  }, [api, connection?.conversationId]);

  return (
    <AppShell tabs={<ChatDebugTabs active={active} />} chatHeader={chatHeader}>
      <div style={{ flexGrow: 1, minHeight: 0, display: 'flex' }}>
        <aside
          style={{
            width: 220,
            flexShrink: 0,
            borderRight: '1px solid var(--border)',
            background: 'var(--surface)',
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            overflowY: 'auto',
          }}
        >
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Sessions
          </div>
          {sessions.map((s) => {
            const isActive = s.id === connection?.conversationId;
            const tone = toneColors(conversationTone(s.state));
            return (
              <div
                key={s.id}
                className="af-card"
                style={{
                  padding: '9px 10px',
                  borderColor: isActive ? 'var(--navy)' : 'var(--border)',
                  background: isActive ? 'var(--surface-2)' : 'var(--surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s.id}
                </span>
                <Badge bg={tone.bg} color={tone.fg}>{s.state}</Badge>
              </div>
            );
          })}
          {sessions.length === 0 && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>No other sessions yet.</span>}
        </aside>
        <div style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>{children}</div>
      </div>
    </AppShell>
  );
}
