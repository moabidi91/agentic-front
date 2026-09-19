import { useBranding, type Branding } from './BrandingProvider';
import { BrandIcon, ICON_IDS, ICON_LABELS } from './icons';

const NAME_PRESETS = ['Console', 'Atlas', 'Nexus', 'Forge', 'Relay'];
const LABEL_PRESETS = ['OPS', 'HUB', 'CORE', 'EDGE', 'NODE'];

function PresetPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <span
      onClick={onClick}
      style={{
        cursor: 'pointer',
        padding: '5px 12px',
        borderRadius: 999,
        border: `1px solid ${active ? 'var(--navy)' : 'var(--border)'}`,
        background: active ? 'var(--navy)' : 'var(--surface-2)',
        color: active ? '#fff' : 'var(--text-2)',
        fontSize: 10.5,
        fontWeight: 700,
      }}
    >
      {label}
    </span>
  );
}

/**
 * The name / label / icon fields from WelcomeScreen, extracted so both the
 * first-run Welcome flow and the Settings → Identity tab edit the exact same
 * fields against the same `useBranding()` state (App identity — mockup
 * Modal.dc.html's avatar menu section, now the Settings modal per the
 * user's explicit "supersedes the mockup" instruction).
 */
export function IdentityFields({ value, onChange }: { value: Branding; onChange: (next: Branding) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 7 }}>
          <label htmlFor="id-name" className="af-field-label">
            Primary name
          </label>
          <input
            id="id-name"
            className="af-input"
            style={{ fontWeight: 700 }}
            value={value.appName}
            placeholder="e.g. Atlas"
            onChange={(e) => onChange({ ...value, appName: e.target.value })}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {NAME_PRESETS.map((p) => (
              <PresetPill key={p} label={p} active={p === value.appName} onClick={() => onChange({ ...value, appName: p })} />
            ))}
          </div>
          <span className="af-field-hint">The main wordmark, shown across every screen.</span>
        </div>

        <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 7 }}>
          <label htmlFor="id-label" className="af-field-label">
            Short label
          </label>
          <input
            id="id-label"
            className="af-input"
            style={{ fontWeight: 700, textTransform: 'uppercase' }}
            value={value.appLabel}
            placeholder="e.g. HUB"
            onChange={(e) => onChange({ ...value, appLabel: e.target.value })}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {LABEL_PRESETS.map((p) => (
              <PresetPill key={p} label={p} active={p === value.appLabel} onClick={() => onChange({ ...value, appLabel: p })} />
            ))}
          </div>
          <span className="af-field-hint">A small badge next to the name.</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span className="af-field-label">Icon</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
          {ICON_IDS.map((id) => {
            const selected = id === value.iconId;
            return (
              <div
                key={id}
                onClick={() => onChange({ ...value, iconId: id })}
                style={{
                  cursor: 'pointer',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 7,
                  padding: '14px 8px',
                  borderRadius: 12,
                  border: `1.6px solid ${selected ? 'var(--navy)' : 'var(--border)'}`,
                  background: selected ? 'var(--surface-2)' : 'var(--surface)',
                  boxSizing: 'border-box',
                }}
              >
                {selected && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 7,
                      right: 7,
                      width: 15,
                      height: 15,
                      borderRadius: '50%',
                      background: 'var(--navy)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={4}>
                      <path d="M4 12l5 5L20 6" />
                    </svg>
                  </div>
                )}
                <BrandIcon id={id} primary="var(--navy)" accent="var(--blue)" size={30} />
                <span style={{ fontSize: 10, fontWeight: 700 }}>{ICON_LABELS[id]}</span>
              </div>
            );
          })}
        </div>
        <span className="af-field-hint">The mark shown next to your name everywhere in the app.</span>
      </div>
    </div>
  );
}

/** Settings → Identity tab: edits the live branding directly (no separate draft/save step). */
export function IdentityFieldsLive() {
  const { branding, setBranding } = useBranding();
  return <IdentityFields value={branding} onChange={setBranding} />;
}
