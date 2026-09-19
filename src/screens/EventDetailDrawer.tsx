import { useEffect } from 'react';
import type { HistoryEvent } from '../api/types';

export function EventDetailDrawer({ event, onClose }: { event: HistoryEvent; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,10,28,0.4)', zIndex: 90 }} onClick={onClose} />
      <div
        className="af-card"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 420,
          maxWidth: '90vw',
          zIndex: 91,
          borderRadius: 0,
          borderRight: 'none',
          borderTop: 'none',
          borderBottom: 'none',
          padding: 22,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{event.type}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{new Date(event.ts).toLocaleString()}</div>

        {event.messageIn && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>Message in</span>
            <pre className="af-card" style={{ padding: 12, fontSize: 11.5, whiteSpace: 'pre-wrap', margin: 0 }}>{event.messageIn}</pre>
          </div>
        )}
        {event.messageOut && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>Message out</span>
            <pre className="af-card" style={{ padding: 12, fontSize: 11.5, whiteSpace: 'pre-wrap', margin: 0, color: 'var(--blue)' }}>{event.messageOut}</pre>
          </div>
        )}
        {event.auditEntryId && (
          <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>Audit entry: <code>{event.auditEntryId}</code></div>
        )}
        {!event.messageIn && !event.messageOut && (
          <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>No message payload recorded for this event.</div>
        )}
      </div>
    </>
  );
}
