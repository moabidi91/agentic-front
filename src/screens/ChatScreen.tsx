import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SessionShell } from '../components/SessionShell';
import { Button } from '../components/Button';
import { SlashCommandMenu } from '../components/SlashCommandMenu';
import { useSession } from '../session/SessionContext';
import { useAppSettings } from '../session/useAppSettings';
import type { ChatHeaderInfo } from '../components/AppShell';
import type { ConversationStatus, PromptRef } from '../api/types';

/** Matches "/" plus a still-being-typed command name — the palette stays open while this matches. */
const SLASH_PATTERN = /^\/(\S*)$/;

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
  const { snapshot, connection, messages, sendMessage, interrupt } = useSession();
  const { settings } = useAppSettings();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [endChoiceDismissed, setEndChoiceDismissed] = useState(false);
  const [slashActiveIndex, setSlashActiveIndex] = useState(0);
  const [slashDismissed, setSlashDismissed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const status = snapshot?.status ?? 'READY';
  const isProcessing = PROCESSING.includes(status);
  const isCompleted = status === 'COMPLETED';

  const availablePrompts = useMemo(() => connection?.prompts ?? [], [connection]);
  const slashMatch = SLASH_PATTERN.exec(draft);
  const slashQuery = slashMatch ? slashMatch[1] : null;
  const slashOpen = slashQuery !== null && availablePrompts.length > 0 && !slashDismissed;
  const slashItems = useMemo(
    () => (slashQuery === null ? [] : availablePrompts.filter((p) => p.name.toLowerCase().includes(slashQuery.toLowerCase()))),
    [availablePrompts, slashQuery],
  );

  // Reset the highlighted row and any Escape-dismissal each time the typed filter changes.
  useEffect(() => {
    setSlashActiveIndex(0);
    setSlashDismissed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slashQuery]);

  const selectPrompt = (p: PromptRef) => {
    setDraft(p.content);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    });
  };

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

  const chatHeader: ChatHeaderInfo | undefined = connection
    ? {
        sessionCode: connection.conversationId.slice(-6).toUpperCase(),
        userLine: `${connection.userId} · ${connection.conversationId}`,
        workingSpace: connection.workingSpace,
        phaseLabel: phaseLabel(status),
        phaseKind: status === 'INTERRUPTED' ? 'interrupted' : isProcessing ? 'processing' : 'idle',
        onPhaseClick: () => navigate('/debug'),
        onReset: () => interrupt(),
      }
    : undefined;

  return (
    <SessionShell active="chat" chatHeader={chatHeader}>
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
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'flex-end',
              gap: 10,
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: '8px 8px 8px 18px',
              background: 'var(--surface-2)',
            }}
          >
            {slashOpen && (
              <SlashCommandMenu items={slashItems} activeIndex={slashActiveIndex} onHover={setSlashActiveIndex} onSelect={selectPrompt} />
            )}
            <textarea
              ref={textareaRef}
              rows={2}
              value={draft}
              placeholder={isProcessing ? 'Send another message — it will queue for the next cycle…' : 'Ask something…'}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (slashOpen) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSlashActiveIndex((i) => Math.min(i + 1, Math.max(slashItems.length - 1, 0)));
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSlashActiveIndex((i) => Math.max(i - 1, 0));
                    return;
                  }
                  if ((e.key === 'Enter' || e.key === 'Tab') && slashItems[slashActiveIndex]) {
                    e.preventDefault();
                    selectPrompt(slashItems[slashActiveIndex]);
                    return;
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setSlashDismissed(true);
                    return;
                  }
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              style={{
                flexGrow: 1,
                resize: 'none',
                border: 'none',
                background: 'none',
                color: 'var(--text)',
                fontSize: 14,
                fontFamily: 'inherit',
                padding: '6px 0',
              }}
            />
            {isProcessing && (
              <button
                type="button"
                aria-label="Stop / interrupt session"
                onClick={() => interrupt()}
                style={{
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                  borderRadius: 10,
                  border: '1px solid var(--red)',
                  background: 'var(--red-soft)',
                  color: 'var(--red)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <rect x="5" y="5" width="14" height="14" rx="2" />
                </svg>
              </button>
            )}
            <button
              type="button"
              aria-label="Send message"
              disabled={!draft.trim() || sending}
              onClick={submit}
              style={{
                width: 40,
                height: 40,
                flexShrink: 0,
                borderRadius: 10,
                border: 'none',
                background: 'var(--navy)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: !draft.trim() || sending ? 0.55 : 1,
                cursor: !draft.trim() || sending ? 'not-allowed' : 'pointer',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M3 11l18-8-8 18-2-8-8-2z" />
              </svg>
            </button>
          </div>
          {isProcessing && (
            <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>
              A message sent now is queued — applied once the current cycle finishes, unless you interrupt.
            </span>
          )}
          {!isProcessing && !draft && availablePrompts.length > 0 && (
            <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>
              Type <span style={{ fontFamily: 'var(--font-mono)' }}>/</span> to insert one of your {availablePrompts.length} saved prompts.
            </span>
          )}
        </div>
      </div>
    </SessionShell>
  );
}
