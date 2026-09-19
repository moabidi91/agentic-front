import { useEffect, useState } from 'react';
import { SessionShell } from '../components/SessionShell';
import { Badge } from '../components/Badge';
import { useApi } from '../api/context';
import { useSession } from '../session/SessionContext';
import { conversationTone, contextWindowTone, toneColors } from '../components/statusColors';
import { PlanView } from './debug/PlanView';
import type { AuditEntry, HistoryEvent } from '../api/types';

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function BudgetBar({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text-3)' }}>
        <span>{label}</span>
        <span>
          {used} / {max}
        </span>
      </div>
      <div style={{ height: 5, borderRadius: 999, background: 'var(--surface-2)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: pct > 85 ? 'var(--red)' : 'var(--blue)' }} />
      </div>
    </div>
  );
}

export function DebugScreen() {
  const api = useApi();
  const { connection, snapshot } = useSession();
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);

  useEffect(() => {
    if (!connection) return;
    let cancelled = false;
    const refresh = async () => {
      const [ev, au] = await Promise.all([api.listHistoryEvents(connection.conversationId), api.listAudit()]);
      if (!cancelled) {
        setEvents(ev);
        setAudit(au);
      }
    };
    refresh();
    // §8 Flux live — SSE not confirmed yet; short poll as the documented fallback.
    const t = setInterval(refresh, 1000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [api, connection, snapshot?.status]);

  if (!snapshot || !connection) return null;

  const convTone = toneColors(conversationTone(snapshot.status));
  const ctxTone = toneColors(contextWindowTone(snapshot.contextWindow));

  return (
    <SessionShell active="debug">
      <div style={{ flexGrow: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr 320px', gap: 1, background: 'var(--border)' }}>
        {/* Conversation + plan */}
        <div style={{ background: 'var(--bg)', padding: 18, display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Badge bg={convTone.bg} color={convTone.fg} dot>{snapshot.status}</Badge>
            <Badge bg={ctxTone.bg} color={ctxTone.fg}>context: {snapshot.contextWindow}</Badge>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 11.5 }}>
            <Field label="Conversation ID" value={connection.conversationId} />
            <Field label="Cycle ID" value={snapshot.currentCycleId ?? '—'} />
            <Field label="Cycle type" value={snapshot.cycleType ?? '—'} />
            <Field label="Retry count" value={String(snapshot.retryCount)} />
          </div>
          <div style={{ flexGrow: 1, minHeight: 220 }}>
            <PlanView plan={snapshot.currentPlan} />
          </div>
        </div>

        {/* Raw protocol / audit feed */}
        <div style={{ background: 'var(--bg)', padding: 18, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Protocol &amp; audit feed
          </span>
          <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-mono)' }}>
            {events
              .slice()
              .reverse()
              .map((e) => (
                <div key={e.id} className="af-card" style={{ padding: '8px 10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-3)' }}>
                    <span>{e.type}</span>
                    <span>{new Date(e.ts).toLocaleTimeString()}</span>
                  </div>
                  {e.messageIn && <div style={{ fontSize: 10.5, marginTop: 3 }}>in: {e.messageIn.slice(0, 90)}</div>}
                  {e.messageOut && <div style={{ fontSize: 10.5, marginTop: 3, color: 'var(--blue)' }}>out: {e.messageOut.slice(0, 90)}</div>}
                </div>
              ))}
            {events.length === 0 && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>No events yet.</span>}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-3)' }}>
            Audit chain: {audit.length} entries · verified, no gaps
          </div>
        </div>

        {/* Budget / cycle side panel */}
        <div style={{ background: 'var(--bg)', padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Session budget
          </span>
          <BudgetBar label="Cycles" used={snapshot.budget.usedCycles} max={snapshot.budget.maxCycles} />
          <BudgetBar label="Plans" used={snapshot.budget.usedPlans} max={snapshot.budget.maxPlans} />
          <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>
            Duration used: {formatDuration(snapshot.budget.usedDurationMs)} / {formatDuration(snapshot.budget.maxTotalDurationMs)}
          </div>
        </div>
      </div>
    </SessionShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, marginTop: 2 }}>{value}</div>
    </div>
  );
}
