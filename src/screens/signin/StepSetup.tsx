import { useEffect, useState } from 'react';
import { useApi } from '../../api/context';
import type { EffortLevel, SkillRef } from '../../api/types';
import { Chip } from '../../components/Chip';
import { FieldHint, FieldLabel, TextInput } from '../../components/Field';
import { useAppSettings, type SessionEndBehavior } from '../../session/useAppSettings';

const EFFORT_OPTIONS: { id: EffortLevel; label: string }[] = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Med' },
  { id: 'high', label: 'High' },
];

const END_BEHAVIOR_OPTIONS: { id: SessionEndBehavior; label: string }[] = [
  { id: 'ask', label: 'Ask each time' },
  { id: 'continue', label: 'Continue automatically' },
  { id: 'new', label: 'Start new automatically' },
];

export function StepSetup({
  workingSpace,
  setWorkingSpace,
  skills,
  setSkills,
  effort,
  setEffort,
  onBack,
  onSubmit,
  submitting,
}: {
  workingSpace: string;
  setWorkingSpace: (v: string) => void;
  skills: SkillRef[];
  setSkills: (v: SkillRef[]) => void;
  effort: EffortLevel;
  setEffort: (v: EffortLevel) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const api = useApi();
  const { settings, setSettings } = useAppSettings();
  const [knownSkills, setKnownSkills] = useState<string[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    api.listKnownSkills().then(setKnownSkills);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addSkill = (name: string) => {
    if (!name || skills.some((s) => s.name === name)) return;
    setSkills([...skills, { name, path: `./skills/${name}` }]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <FieldLabel htmlFor="workdir">Working folder</FieldLabel>
        <TextInput
          id="workdir"
          value={workingSpace}
          onChange={(e) => setWorkingSpace(e.target.value)}
          placeholder="Optional — a folder the model can work in"
        />
        <FieldHint>
          Mounted as a temporary <code>working_space</code>, cleaned up automatically once the task ends. (A native folder
          picker replaces this text field once packaged with Tauri.)
        </FieldHint>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <FieldLabel>Skills</FieldLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {skills.map((s) => (
            <Chip key={s.name} label={s.name} onRemove={() => setSkills(skills.filter((x) => x.name !== s.name))} />
          ))}
          {knownSkills
            .filter((s) => !skills.some((sel) => sel.name === s))
            .map((s) => (
              <button
                key={s}
                onClick={() => addSkill(s)}
                className="af-chip"
                style={{ border: '1px dashed var(--border)', color: 'var(--text-3)', background: 'none' }}
              >
                + {s}
              </button>
            ))}
        </div>
        <FieldHint>Optional — files made available to the model for this session.</FieldHint>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <FieldLabel>Effort</FieldLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          {EFFORT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setEffort(opt.id)}
              className="af-btn"
              style={{
                flex: 1,
                background: effort === opt.id ? 'var(--navy)' : 'var(--surface-2)',
                color: effort === opt.id ? '#fff' : 'var(--text-2)',
                border: `1px solid ${effort === opt.id ? 'var(--navy)' : 'var(--border)'}`,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <FieldHint>
          Sent to the model as a note to parallelize more or less, within system limits — the front never computes a
          thread count itself.
        </FieldHint>
      </div>

      <button
        onClick={() => setAdvancedOpen((o) => !o)}
        style={{ background: 'none', border: 'none', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          style={{ transform: advancedOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.12s' }}
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
        Advanced settings
      </button>

      {advancedOpen && (
        <div className="af-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <FieldLabel>When a session completes</FieldLabel>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {END_BEHAVIOR_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSettings({ ...settings, sessionEndBehavior: opt.id })}
                  className="af-btn af-btn--sm"
                  style={{
                    background: settings.sessionEndBehavior === opt.id ? 'var(--navy)' : 'var(--surface)',
                    color: settings.sessionEndBehavior === opt.id ? '#fff' : 'var(--text-2)',
                    border: `1px solid ${settings.sessionEndBehavior === opt.id ? 'var(--navy)' : 'var(--border)'}`,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <FieldHint>The app itself never stops, regardless of this choice.</FieldHint>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <button onClick={onBack} className="af-btn af-btn--ghost" style={{ paddingLeft: 0 }}>
          ← Back
        </button>
        <button className="af-btn af-btn--primary" onClick={onSubmit} disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </div>
    </div>
  );
}
