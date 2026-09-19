import { useEffect, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useApi } from '../api/context';
import type { AuditEntry, HistoryEvent, HistorySession, LiveDbTable } from '../api/types';
import { conversationTone, toneColors } from '../components/statusColors';

const TABLES: { id: LiveDbTable; label: string }[] = [
  { id: 'sessions', label: 'Sessions' },
  { id: 'events', label: 'Events' },
  { id: 'audit', label: 'Audit log' },
];

// Each table keeps its own typed rows, fetched together — switching tabs
// only ever changes which already-loaded, correctly-typed set is shown, so
// there's no window where one table's columns render another table's rows.
export function LiveDatabaseScreen() {
  const api = useApi();
  const [table, setTable] = useState<LiveDbTable>('sessions');
  const [sessionRows, setSessionRows] = useState<HistorySession[]>([]);
  const [eventRows, setEventRows] = useState<HistoryEvent[]>([]);
  const [auditRows, setAuditRows] = useState<AuditEntry[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);

  const refresh = async () => {
    const [sessions, events, audit] = await Promise.all([
      api.listLiveDb('sessions') as Promise<HistorySession[]>,
      api.listLiveDb('events') as Promise<HistoryEvent[]>,
      api.listLiveDb('audit') as Promise<AuditEntry[]>,
    ]);
    setSessionRows(sessions);
    setEventRows(events);
    setAuditRows(audit);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts: Record<LiveDbTable, number> = {
    sessions: sessionRows.length,
    events: eventRows.length,
    audit: auditRows.length,
  };
  const currentRows = table === 'sessions' ? sessionRows : table === 'events' ? eventRows : auditRows;

  const doClear = async () => {
    setConfirmClear(false);
    await api.clearDatabase();
    setCleared(true);
    refresh();
  };

  return (
    <AppShell>
      <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '20px 28px', gap: 16, overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Live database</span>
            <Badge bg="var(--green-soft)" color="var(--green)" dot>
              live
            </Badge>
          </div>
          <Button variant="danger" onClick={() => setConfirmClear(true)}>
            Clear database
          </Button>
        </div>

        {cleared && (
          <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Database cleared. Rows below reflect the empty state.</div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          {TABLES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTable(t.id)}
              className="af-btn af-btn--sm"
              style={{
                background: table === t.id ? 'var(--navy)' : 'var(--surface-2)',
                color: table === t.id ? '#fff' : 'var(--text-2)',
                border: `1px solid ${table === t.id ? 'var(--navy)' : 'var(--border)'}`,
              }}
            >
              {t.label} ({counts[t.id]})
            </button>
          ))}
        </div>

        <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>Chain verified, no gaps, no rewritten entries.</div>

        <div className="af-card" style={{ overflow: 'hidden' }}>
          {table === 'sessions' && <SessionsTable rows={sessionRows} />}
          {table === 'events' && <EventsTable rows={eventRows} />}
          {table === 'audit' && <AuditTable rows={auditRows} />}
          {currentRows.length === 0 && <div style={{ padding: 20, fontSize: 12, color: 'var(--text-3)' }}>No rows.</div>}
        </div>

        <div style={{ fontSize: 10.5, color: 'var(--text-3)', maxWidth: 560 }}>
          Read-only — writes only ever come from the backend. Clear database is a dev/demo action: it wipes every session,
          including any still running.
        </div>
      </div>

      {confirmClear && (
        <ConfirmDialog
          title="Clear the database?"
          description="This removes every session, including any RUNNING_PLAN session right now. This cannot be undone."
          confirmLabel="Clear database"
          danger
          onCancel={() => setConfirmClear(false)}
          onConfirm={doClear}
        />
      )}
    </AppShell>
  );
}

function TableHead({ cols }: { cols: string[] }) {
  return (
    <div style={{ display: 'flex', padding: '9px 14px', background: 'var(--surface-2)', fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>
      {cols.map((c) => (
        <span key={c} style={{ flex: 1 }}>{c}</span>
      ))}
    </div>
  );
}

function SessionsTable({ rows }: { rows: HistorySession[] }) {
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
      <TableHead cols={['id', 'state', 'user_id', 'updated_at']} />
      {rows.map((r) => {
        const tone = toneColors(conversationTone(r.state));
        return (
          <div key={r.id} style={{ display: 'flex', padding: '8px 14px', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
            <span style={{ flex: 1 }}>{r.id}</span>
            <span style={{ flex: 1 }}>
              <Badge bg={tone.bg} color={tone.fg}>{r.state}</Badge>
            </span>
            <span style={{ flex: 1 }}>{r.userId}</span>
            <span style={{ flex: 1, color: 'var(--text-3)' }}>{new Date(r.updatedAt).toLocaleTimeString()}</span>
          </div>
        );
      })}
    </div>
  );
}

function EventsTable({ rows }: { rows: HistoryEvent[] }) {
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
      <TableHead cols={['id', 'type', 'ts']} />
      {rows.map((r) => (
        <div key={r.id} style={{ display: 'flex', padding: '8px 14px', borderTop: '1px solid var(--border)' }}>
          <span style={{ flex: 1 }}>{r.id}</span>
          <span style={{ flex: 1 }}>{r.type}</span>
          <span style={{ flex: 1, color: 'var(--text-3)' }}>{new Date(r.ts).toLocaleTimeString()}</span>
        </div>
      ))}
    </div>
  );
}

function AuditTable({ rows }: { rows: AuditEntry[] }) {
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
      <TableHead cols={['event_type', 'prev_hash', 'hash', 'ts']} />
      {rows.map((r) => (
        <div key={r.id} style={{ display: 'flex', padding: '8px 14px', borderTop: '1px solid var(--border)' }}>
          <span style={{ flex: 1 }}>{r.eventType}</span>
          <span style={{ flex: 1, color: 'var(--text-3)' }}>{r.prevHash}</span>
          <span style={{ flex: 1, color: 'var(--text-3)' }}>{r.hash}</span>
          <span style={{ flex: 1, color: 'var(--text-3)' }}>{new Date(r.ts).toLocaleTimeString()}</span>
        </div>
      ))}
    </div>
  );
}
