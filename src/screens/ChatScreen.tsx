import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SessionShell } from '../components/SessionShell';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { useSession } from '../session/SessionContext';
import { conversationTone, toneColors } from '../components/statusColors';
import { useAppSettings } from '../session/useAppSettings';
import type { ConversationStatus } from '../api/types';

const PROCESSING: ConversationStatus[] = ['ACTIVE', 'WAITING_MODEL_RESPONSE', 'RUNNING_PLAN', 'ROTATING'];

function phaseLabel(status: ConversationStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'Working';
    case 'WAITING_MODEL_RESPONSE':
      return 'Waiting on model';
    case 'RUNNING_PLAN':
      return 'Running plan';
    case 'ROTATING':
      return 'Rotating context';
    case 'INTERRUPTED':
      return 'Interrupted';
    case 'COMPLETED':
      return 'Completed';
    case 'FAILED':
      return 'Failed';
    default:
      return 'Ready';
  }
}

export function ChatScreen() {
  const navigate = useNavigate();
  const { snapshot, messages, sendMessage, interrupt } = useSession();
  const { settings } = useAppSettings();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [endChoiceDismissed, setEndChoiceDismissed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const status = snapshot?.status ?? 'READY';
  const isProcessing = PROCESSING.includes(status);
  const isCompleted = status === 'COMPLETED';

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (isCompleted) setEndChoiceDismissed(false);
  }, [isCompleted]);

  useEffect(() => {
    if (isCompleted && settings.sessionEndBehavior !== 'ask') {
      setEndChoiceDismissed(true);
    }
  }, [isCompleted, settings.sessionEndBehavior]);

  const submit = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    setSending(true);
    try {
      await sendMessage(text);
    } finally {
      setSending(false);
    }
  };

  const tone = toneColors(conversationTone(status));

  return (
    <SessionShell active="chat">
      <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            padding: '10px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <button onClick={() => navigate('/debug')} style={{ background: 'none', border: 'none', padding: 0 }}>
            <Badge bg={tone.bg} color={tone.fg} dot>
              {phaseLabel(status)}
            </Badge>
          </button>
          {snapshot?.currentPlan && (
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              Plan: {snapshot.currentPlan.tasks.filter((t) => t.status === 'COMPLETED').length}/{snapshot.currentPlan.tasks.length} tasks ·{' '}
              <button onClick={() => navigate('/debug')} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontWeight: 700, padding: 0 }}>
                view detail
              </button>
            </span>
          )}
        </div>

        <div ref={scrollRef} style={{ flexGrow: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {messages.length === 0 && (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-3)', fontSize: 12.5 }}>
              Ask anything to get started.
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div
                className="af-card"
                style={{
                  maxWidth: 560,
                  padding: '11px 15px',
                  background: m.role === 'user' ? 'var(--navy)' : 'var(--surface)',
                  color: m.role === 'user' ? '#fff' : 'var(--text)',
                  borderColor: m.role === 'user' ? 'var(--navy)' : 'var(--border)',
                }}
              >
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>{m.text}</div>
                {m.queued && (
                  <div style={{ fontSize: 10, marginTop: 6, opacity: 0.8, fontStyle: 'italic' }}>
                    Queued — applied once the current cycle finishes, unless you interrupt.
                  </div>
                )}
                {m.planSummary && (
                  <button
                    onClick={() => navigate('/debug')}
                    style={{ background: 'none', border: 'none', padding: 0, marginTop: 6, fontSize: 10.5, fontWeight: 700, color: 'var(--blue)' }}
                  >
                    {m.planSummary} → view in Debug
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {isCompleted && !endChoiceDismissed && (
          <div
            style={{
              margin: '0 24px 14px',
              padding: '12px 16px',
              borderRadius: 12,
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>Final response received. Continue this session, or start a new one?</span>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <Button size="sm" variant="secondary" onClick={() => setEndChoiceDismissed(true)}>
                Continue chatting
              </Button>
              <Button size="sm" variant="primary" onClick={() => window.location.reload()}>
                New session
              </Button>
            </div>
          </div>
        )}

        <div style={{ padding: '14px 24px 20px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <textarea
              className="af-textarea"
              rows={2}
              value={draft}
              placeholder={isProcessing ? 'Send another message — it will queue for the next cycle…' : 'Ask something…'}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              style={{ flexGrow: 1 }}
            />
            {isProcessing && (
              <Button variant="danger" onClick={() => interrupt()}>
                Stop
              </Button>
            )}
            <Button variant="primary" disabled={!draft.trim() || sending} onClick={submit}>
              Send
            </Button>
          </div>
          {isProcessing && (
            <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>
              A message sent now is queued — applied once the current cycle finishes, unless you interrupt.
            </span>
          )}
        </div>
      </div>
    </SessionShell>
  );
}
