import { useState } from 'react';
import type { Plan, PlanTask } from '../../api/types';
import { Badge } from '../../components/Badge';
import { taskTone, toneColors } from '../../components/statusColors';

export function PlanView({ plan }: { plan: Plan | null }) {
  const [mode, setMode] = useState<'list' | 'diagram'>('list');

  if (!plan) {
    return <div style={{ fontSize: 12, color: 'var(--text-3)', padding: 16 }}>No plan running for this cycle yet.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Plan · {plan.status}
        </span>
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', borderRadius: 999, padding: 3 }}>
          {(['list', 'diagram'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="af-btn af-btn--sm"
              style={{
                background: mode === m ? 'var(--surface)' : 'transparent',
                color: mode === m ? 'var(--text)' : 'var(--text-3)',
                textTransform: 'capitalize',
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flexGrow: 1, minHeight: 0, overflowY: 'auto' }}>
        {mode === 'list' ? <PlanTaskList tasks={plan.tasks} /> : <PlanTaskGraph tasks={plan.tasks} />}
      </div>
    </div>
  );
}

export function PlanTaskList({ tasks }: { tasks: PlanTask[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {tasks.map((t) => {
        const tone = toneColors(taskTone(t.status));
        return (
          <div key={t.taskId} className="af-card" style={{ padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.summary}</div>
              {t.error && <div style={{ fontSize: 10.5, color: 'var(--red)', marginTop: 2 }}>{t.error}</div>}
            </div>
            <Badge bg={tone.bg} color={tone.fg}>{t.status}</Badge>
          </div>
        );
      })}
    </div>
  );
}

export function PlanTaskGraph({ tasks }: { tasks: PlanTask[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '6px 2px' }}>
      {tasks.map((t, i) => {
        const tone = toneColors(taskTone(t.status));
        return (
          <div key={t.taskId} style={{ display: 'flex', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: tone.fg, flexShrink: 0 }} />
              {i < tasks.length - 1 && <div style={{ width: 2, flexGrow: 1, background: 'var(--border)', marginTop: 2 }} />}
            </div>
            <div className="af-card" style={{ flexGrow: 1, padding: '9px 12px', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{t.summary}</span>
                <Badge bg={tone.bg} color={tone.fg}>{t.status}</Badge>
              </div>
              {t.dependsOn.length > 0 && (
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>depends on: {t.dependsOn.join(', ')}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
