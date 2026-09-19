import { useEffect, useState } from 'react';
import { SessionShell } from '../components/SessionShell';
import { Badge } from '../components/Badge';
import { useApi } from '../api/context';
import { useSession } from '../session/SessionContext';
import { conversationTone, toneColors } from '../components/statusColors';
import type { HistoryEvent, HistorySession } from '../api/types';
import { EventDetailDrawer } from './EventDetailDrawer';

const EVENT_COPY: Record<string, string> = {
  session_created: 'Session started',
  user_request: 'Message received',
  user_request_queued: 'Message queued',
  model_call: 'Called the model',
  plan_received: 'Plan received',
  task_progress: 'Task progressed',
  final_response: 'Final response received',
  user_interrupt: 'Interrupted by user',
};

export function HistoryScreen() {
  const api = useApi();
  const { connection } = useSession();
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [openEvent, setOpenEvent] = useState<HistoryEvent | null>(null);

  useEffect(() => {
    api.listHistorySessions().then((list) => {
      setSessions(list);
      setSelectedId((current) => current ?? connection?.conversationId ?? list[0]?.id ?? null);
    });
  }, [api, connection?.conversationId]);

  useEffect(() => {
    if (!selectedId) return;
    api.listHistoryEvents(selectedId).then(setEvents);
  }, [api, selectedId]);

  return (
    <SessionShell active="history">
      <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '20px 28px', gap: 16, overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>History</span>
          <select
            className="af-input"
            style={{ width: 260, height: 32, fontSize: 12 }}
            value={selectedId ?? ''}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} — {s.state}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {events.map((e) => {
            const tone = toneColors(conversationTone('READY'));
            return (
              <button
                key={e.id}
                onClick={() => setOpenEvent(e)}
                className="af-card"
                style={{ textAlign: 'left', padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <Badge bg={tone.bg} color={tone.fg}>{EVENT_COPY[e.type] ?? e.type}</Badge>
                  {e.messageIn && (
                    <span style={{ fontSize: 11.5, color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {e.messageIn}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 10.5, color: 'var(--text-3)', flexShrink: 0 }}>{new Date(e.ts).toLocaleTimeString()}</span>
              </button>
            );
          })}
          {events.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>No events recorded for this session yet.</span>}
        </div>
      </div>
      {openEvent && <EventDetailDrawer event={openEvent} onClose={() => setOpenEvent(null)} />}
    </SessionShell>
  );
}
