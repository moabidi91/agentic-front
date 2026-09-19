import { useState } from 'react';
import { AppShell } from '../components/AppShell';
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

type Machine = 'conv' | 'plan' | 'task' | 'ctx';

const TONE_COLORS: Record<Branch['tone'], { bg: string; fg: string; border: string }> = {
  neutral: { bg: 'var(--surface)', fg: 'var(--text)', border: 'var(--border)' },
  warning: { bg: 'var(--amber-soft)', fg: 'var(--text)', border: 'var(--amber)' },
  danger: { bg: 'var(--red-soft)', fg: 'var(--text)', border: 'var(--red)' },
};

function StateChip({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'info' | 'warning' | 'success' }) {
  const map = {
    neutral: { bg: 'var(--surface)', fg: 'var(--text-2)', border: 'var(--border)' },
    info: { bg: 'var(--blue)22', fg: 'var(--blue)', border: 'var(--blue)' },
    warning: { bg: 'var(--amber-soft)', fg: 'var(--amber)', border: 'var(--amber)' },
    success: { bg: 'var(--green-soft)', fg: 'var(--green)', border: 'var(--green)' },
  }[tone];
  return (
    <span
      style={{
        padding: '6px 12px',
        borderRadius: 999,
        background: map.bg,
        border: `1px solid ${map.border}`,
        fontSize: 10.5,
        fontWeight: 700,
        color: map.fg,
        fontFamily: 'var(--font-mono)',
      }}
    >
      {label}
    </span>
  );
}

function Arrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth={2}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function BranchCard({ branch }: { branch: Branch }) {
  const c = TONE_COLORS[branch.tone];
  return (
    <div style={{ border: `1px solid ${c.border}`, borderRadius: 10, padding: '10px 12px', background: c.bg }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{branch.path}</div>
      <div style={{ fontSize: 10.5, color: 'var(--text-2)', marginTop: 3, lineHeight: 1.45 }}>{branch.detail}</div>
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

export function StateMachineScreen() {
  const [machine, setMachine] = useState<Machine>('conv');
  const { snapshot, connection } = useSession();

  return (
    <AppShell>
      <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
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
          <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>
            Source of truth: <code style={{ color: 'var(--text-2)' }}>spec-v1.1.md §5</code> — this screen never changes it.
          </span>
        </div>

        <div style={{ flexGrow: 1, minHeight: 0, display: 'flex' }}>
          <div style={{ flexGrow: 1, padding: '22px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {machine === 'conv' && (
              <>
                <div>
                  <SectionLabel>Happy path</SectionLabel>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {CONVERSATION_HAPPY_PATH.map((s, i) => (
                      <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <StateChip label={s} tone={s === 'COMPLETED' ? 'success' : s === 'WAITING_MODEL_RESPONSE' ? 'info' : 'neutral'} />
                        {i < CONVERSATION_HAPPY_PATH.length - 1 && <Arrow />}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <SectionLabel>Branches off the happy path</SectionLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 8 }}>
                    {CONVERSATION_BRANCHES.map((b) => (
                      <BranchCard key={b.path} branch={b} />
                    ))}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <BranchCard branch={CONVERSATION_FAILURE} />
                  </div>
                </div>
                <div>
                  <SectionLabel>Full transition table</SectionLabel>
                  <div className="af-card" style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>
                    {CONVERSATION_TRANSITIONS.map((t, i) => (
                      <div key={i} style={{ display: 'flex', padding: '7px 12px', background: i % 2 ? 'var(--surface-2)' : 'transparent' }}>
                        <span style={{ flex: 1, color: 'var(--text-2)' }}>{t.from}</span>
                        <span style={{ color: 'var(--text-3)', padding: '0 8px' }}>→</span>
                        <span style={{ flex: 1, color: 'var(--text-2)' }}>{t.to}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {machine === 'plan' && (
              <>
                <div>
                  <SectionLabel>Plan states</SectionLabel>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <StateChip label="PENDING" />
                    <Arrow />
                    <StateChip label="RUNNING" tone="warning" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 8 }}>
                  {PLAN_BRANCHES.map((b) => (
                    <BranchCard key={b.path} branch={b} />
                  ))}
                </div>
              </>
            )}

            {machine === 'task' && (
              <>
                <div>
                  <SectionLabel>Task states</SectionLabel>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <StateChip label="PENDING" />
                    <Arrow />
                    <StateChip label="WAITING_DEPENDENCY" />
                    <Arrow />
                    <StateChip label="RUNNING" tone="warning" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                  {TASK_TRANSITIONS.map((b) => (
                    <BranchCard key={b.path} branch={b} />
                  ))}
                </div>
              </>
            )}

            {machine === 'ctx' && (
              <>
                <div>
                  <SectionLabel>Context window states</SectionLabel>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <StateChip label="HEALTHY" tone="success" />
                    <Arrow />
                    <StateChip label="WARNING" tone="warning" />
                    <Arrow />
                    <StateChip label="SATURATED" tone="warning" />
                    <span style={{ fontSize: 10, color: 'var(--text-3)' }}>back to HEALTHY after rotation + model ACK</span>
                  </div>
                </div>
                <div className="af-card" style={{ padding: '12px 14px', maxWidth: 560 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>SATURATED triggers a conversation rotation</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-2)', lineHeight: 1.55 }}>{CONTEXT_ROTATION_SEQUENCE}</div>
                </div>
              </>
            )}
          </div>

          <div style={{ width: 300, flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'var(--surface)', padding: 20, display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>
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
        </div>
      </div>
    </AppShell>
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
