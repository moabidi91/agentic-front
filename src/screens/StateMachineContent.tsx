import type { CSSProperties } from 'react';
import { useState } from 'react';
import { Badge } from '../components/Badge';
import { useSession } from '../session/SessionContext';
import {
  CONTEXT_ROTATION_SEQUENCE,
  CONVERSATION_BRANCHES,
  CONVERSATION_FAILURE,
  CONVERSATION_HAPPY_PATH,
  CONVERSATION_TRANSITIONS,
  CYCLE_TYPES,
  PLAN_BRANCHES,
  TASK_TRANSITIONS,
  type Branch,
} from './stateMachineData';

/**
 * The state-machine reference, redrawn hand-sketched / whiteboard style at
 * the user's explicit request: no arrow icons, no arrow glyphs anywhere —
 * every flow is told as ordered, numbered prose ("1. NEW, then 2. ACTIVE…")
 * instead of chips joined by arrow SVGs. Extracted from StateMachineScreen
 * so it can also be embedded as a Settings-modal tab without duplicating
 * the logic (see SettingsModal.tsx).
 */

type Machine = 'conv' | 'plan' | 'task' | 'ctx';

const TONE_COLORS: Record<Branch['tone'], { bg: string; fg: string; border: string }> = {
  neutral: { bg: 'var(--surface)', fg: 'var(--text)', border: 'var(--border)' },
  warning: { bg: 'var(--amber-soft)', fg: 'var(--text)', border: 'var(--amber)' },
  danger: { bg: 'var(--red-soft)', fg: 'var(--text)', border: 'var(--red)' },
};

/** "A → B → C" (or "A → B (note)") becomes plain prose — "A, then B, then C" — never a graphic. */
function toProse(path: string): string {
  return path
    .split('→')
    .map((s) => s.trim())
    .filter(Boolean)
    .join(', then ');
}

// Small alternating tilt + irregular corner-radius set per card index, for the sketched feel.
const TILTS = [-1.4, 1.1, -0.9, 1.5, -1.2, 0.8, -1.6, 1.3];
const RADII = ['10px 15px 9px 16px', '15px 9px 16px 10px', '9px 16px 10px 14px', '16px 10px 14px 9px'];

function sketchStyle(i: number): CSSProperties {
  return {
    transform: `rotate(${TILTS[i % TILTS.length]}deg)`,
    borderRadius: RADII[i % RADII.length],
  };
}

const HAND_FONT = "'Kalam', var(--font-sans)";

function HandHeading({ children }: { children: string }) {
  return (
    <div
      style={{
        fontFamily: HAND_FONT,
        fontSize: 16,
        fontWeight: 700,
        color: 'var(--text)',
        marginBottom: 10,
        transform: 'rotate(-0.6deg)',
      }}
    >
      {children}
    </div>
  );
}

/** One numbered step in a sequence — a sticky-note-ish card, no connecting arrow. */
function StepNote({ index, label, tone = 'neutral' }: { index: number; label: string; tone?: 'neutral' | 'info' | 'success' }) {
  const map = {
    neutral: { bg: 'var(--surface)', fg: 'var(--text)', border: 'var(--border)' },
    info: { bg: 'var(--blue)22', fg: 'var(--blue)', border: 'var(--blue)' },
    success: { bg: 'var(--green-soft)', fg: 'var(--green)', border: 'var(--green)' },
  }[tone];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '8px 14px 8px 10px',
        border: `1.6px dashed ${map.border}`,
        background: map.bg,
        ...sketchStyle(index),
      }}
    >
      <span
        style={{
          width: 20,
          height: 20,
          flexShrink: 0,
          borderRadius: '50%',
          border: `1.4px solid ${map.fg}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: HAND_FONT,
          fontSize: 12,
          fontWeight: 700,
          color: map.fg,
        }}
      >
        {index + 1}
      </span>
      <span style={{ fontSize: 11.5, fontWeight: 700, fontFamily: 'var(--font-mono)', color: map.fg }}>{label}</span>
    </div>
  );
}

function StepSequence({ states, highlight }: { states: string[]; highlight?: (s: string, i: number) => 'neutral' | 'info' | 'success' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      {states.map((s, i) => (
        <StepNote key={s} index={i} label={s} tone={highlight ? highlight(s, i) : 'neutral'} />
      ))}
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
      {children}
    </div>
  );
}

function BranchCard({ branch, index }: { branch: Branch; index: number }) {
  const c = TONE_COLORS[branch.tone];
  return (
    <div
      style={{
        border: `1.6px dashed ${c.border}`,
        padding: '11px 13px',
        background: c.bg,
        ...sketchStyle(index),
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: c.fg, lineHeight: 1.5 }}>{toProse(branch.path)}</div>
      <div style={{ fontSize: 10.5, color: 'var(--text-2)', marginTop: 5, lineHeight: 1.5, fontFamily: 'var(--font-sans)' }}>{branch.detail}</div>
    </div>
  );
}

function TransitionProse({ transitions }: { transitions: { from: string; to: string }[] }) {
  return (
    <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 0 }}>
      {transitions.map((t, i) => (
        <li
          key={i}
          style={{
            padding: '8px 12px',
            fontSize: 11.5,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-2)',
            background: i % 2 ? 'var(--surface-2)' : 'transparent',
          }}
        >
          From <strong style={{ color: 'var(--text)' }}>{t.from}</strong>, then <strong style={{ color: 'var(--text)' }}>{t.to}</strong>.
        </li>
      ))}
    </ol>
  );
}

export function StateMachineContent({ embedded = false }: { embedded?: boolean }) {
  const [machine, setMachine] = useState<Machine>('conv');
  const { snapshot, connection } = useSession();

  return (
    <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-sans)' }}>
      <div style={{ padding: embedded ? '10px 16px' : '12px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 9, padding: 2, gap: 2 }}>
          {(['conv', 'plan', 'task', 'ctx'] as Machine[]).map((m) => (
            <button
              key={m}
              onClick={() => setMachine(m)}
              className="af-btn af-btn--sm"
              style={{ background: machine === m ? 'var(--navy)' : 'transparent', color: machine === m ? '#fff' : 'var(--text-2)' }}
            >
              {{ conv: 'Conversation', plan: 'Plan', task: 'Task', ctx: 'Context window' }[m]}
            </button>
          ))}
        </div>
        {!embedded && (
          <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>
            Source of truth: <code style={{ color: 'var(--text-2)' }}>spec-v1.1.md §5</code> — this screen never changes it.
          </span>
        )}
      </div>

      <div style={{ flexGrow: 1, minHeight: 0, display: 'flex' }}>
        <div
          style={{
            flexGrow: 1,
            padding: embedded ? '18px 20px' : '22px 28px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
          }}
        >
          {machine === 'conv' && (
            <>
              <div>
                <HandHeading>Happy path, step by step</HandHeading>
                <StepSequence
                  states={CONVERSATION_HAPPY_PATH}
                  highlight={(s) => (s === 'COMPLETED' ? 'success' : s === 'WAITING_MODEL_RESPONSE' ? 'info' : 'neutral')}
                />
              </div>
              <div>
                <SectionLabel>Branches off the happy path</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${embedded ? 220 : 260}px, 1fr))`, gap: 14 }}>
                  {CONVERSATION_BRANCHES.map((b, i) => (
                    <BranchCard key={b.path} branch={b} index={i} />
                  ))}
                </div>
                <div style={{ marginTop: 14 }}>
                  <BranchCard branch={CONVERSATION_FAILURE} index={CONVERSATION_BRANCHES.length} />
                </div>
              </div>
              <div>
                <SectionLabel>Full transition table, in words</SectionLabel>
                <div className="af-card" style={{ overflow: 'hidden' }}>
                  <TransitionProse transitions={CONVERSATION_TRANSITIONS} />
                </div>
              </div>
            </>
          )}

          {machine === 'plan' && (
            <>
              <div>
                <HandHeading>Plan states</HandHeading>
                <StepSequence states={['PENDING', 'RUNNING']} highlight={(_s, i) => (i === 1 ? 'info' : 'neutral')} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${embedded ? 220 : 260}px, 1fr))`, gap: 14 }}>
                {PLAN_BRANCHES.map((b, i) => (
                  <BranchCard key={b.path} branch={b} index={i} />
                ))}
              </div>
            </>
          )}

          {machine === 'task' && (
            <>
              <div>
                <HandHeading>Task states</HandHeading>
                <StepSequence states={['PENDING', 'WAITING_DEPENDENCY', 'RUNNING']} highlight={(_s, i) => (i === 2 ? 'info' : 'neutral')} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${embedded ? 200 : 220}px, 1fr))`, gap: 14 }}>
                {TASK_TRANSITIONS.map((b, i) => (
                  <BranchCard key={b.path} branch={b} index={i} />
                ))}
              </div>
            </>
          )}

          {machine === 'ctx' && (
            <>
              <div>
                <HandHeading>Context window states</HandHeading>
                <StepSequence
                  states={['HEALTHY', 'WARNING', 'SATURATED']}
                  highlight={(s) => (s === 'HEALTHY' ? 'success' : s === 'SATURATED' ? 'info' : 'neutral')}
                />
                <span style={{ fontSize: 10.5, color: 'var(--text-3)', display: 'block', marginTop: 8 }}>
                  Goes back to HEALTHY once a rotation finishes and the model acknowledges it.
                </span>
              </div>
              <div className="af-card" style={{ padding: '14px 16px', maxWidth: 620 }}>
                <div style={{ fontFamily: HAND_FONT, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                  What happens when SATURATED is hit
                </div>
                <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {CONTEXT_ROTATION_SEQUENCE.split('→').map((step, i) => (
                    <li key={i} style={{ fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.5 }}>
                      {step.trim()}
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}
        </div>

        {!embedded && (
          <div
            style={{
              width: 300,
              flexShrink: 0,
              borderLeft: '1px solid var(--border)',
              background: 'var(--surface)',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              overflowY: 'auto',
            }}
          >
            <div>
              <SectionLabel>Current cycle</SectionLabel>
              {snapshot ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  <Row label="cycle_id" value={snapshot.currentCycleId ?? '—'} />
                  <Row label="cycle_type" value={snapshot.cycleType ?? '—'} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-3)' }}>status</span>
                    <Badge bg="var(--amber-soft)" color="var(--amber)">{snapshot.status}</Badge>
                  </div>
                  <Row label="retry_count" value={String(snapshot.retryCount)} />
                  <Row label="conversation_id" value={connection?.conversationId ?? '—'} />
                </div>
              ) : (
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>No active session — sign in to see live cycle info.</span>
              )}
            </div>

            <div>
              <SectionLabel>Cycle types</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11, color: 'var(--text-2)' }}>
                {CYCLE_TYPES.map((c) => (
                  <div key={c.id}>
                    <code style={{ color: 'var(--text)' }}>{c.id}</code> — {c.description}
                  </div>
                ))}
              </div>
            </div>

            {snapshot && (
              <div className="af-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <SectionLabel>Session budget</SectionLabel>
                <BudgetRow label="max_cycles" used={snapshot.budget.usedCycles} max={snapshot.budget.maxCycles} />
                <BudgetRow label="max_plans" used={snapshot.budget.usedPlans} max={snapshot.budget.maxPlans} />
                <span style={{ fontSize: 9.5, color: 'var(--text-3)', lineHeight: 1.4 }}>
                  Any budget exceeded → session ends with <code>BUDGET_EXCEEDED</code>.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: 'var(--text-3)' }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function BudgetRow({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
        <span>{label}</span>
        <span>
          {used} / {max}
        </span>
      </div>
      <div style={{ height: 5, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--green)' }} />
      </div>
    </div>
  );
}
