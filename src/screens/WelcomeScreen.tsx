import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBranding, type Branding } from '../branding/BrandingProvider';
import { BrandIcon, ICON_IDS, ICON_LABELS } from '../branding/icons';
import { Spinner } from '../components/Spinner';

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

export function WelcomeScreen() {
  const navigate = useNavigate();
  const { branding: saved, setBranding } = useBranding();
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Branding>(saved);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(t);
  }, []);

  const continueToSignIn = () => {
    setBranding(draft);
    navigate('/signin');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1040,
          minHeight: 640,
          borderRadius: 20,
          boxShadow: 'var(--shadow-lg)',
          background: 'var(--surface)',
          padding: '46px 50px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {loading ? (
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
            <Spinner size={46} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Retrieving your environment…</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 6 }}>Just a moment while we load your local settings.</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 26, height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth={2.4}>
                  <path d="M4 12l5 5L20 6" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.4 }}>We've retrieved your information.</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55, marginTop: 2 }}>
                  Let's start by choosing the name and icon that suit you — you can change this anytime later in settings.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 36, flexGrow: 1, minHeight: 0, flexWrap: 'wrap' }}>
              <div style={{ flexGrow: 1, minWidth: 320, display: 'flex', flexDirection: 'column', gap: 22 }}>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <label htmlFor="wname" className="af-field-label">Primary name</label>
                    <input
                      id="wname"
                      className="af-input"
                      style={{ fontWeight: 700 }}
                      value={draft.appName}
                      placeholder="e.g. Atlas"
                      onChange={(e) => setDraft((d) => ({ ...d, appName: e.target.value }))}
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {NAME_PRESETS.map((p) => (
                        <PresetPill key={p} label={p} active={p === draft.appName} onClick={() => setDraft((d) => ({ ...d, appName: p }))} />
                      ))}
                    </div>
                    <span className="af-field-hint">The main wordmark, shown across every screen.</span>
                  </div>

                  <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <label htmlFor="wlabel" className="af-field-label">Short label</label>
                    <input
                      id="wlabel"
                      className="af-input"
                      style={{ fontWeight: 700, textTransform: 'uppercase' }}
                      value={draft.appLabel}
                      placeholder="e.g. HUB"
                      onChange={(e) => setDraft((d) => ({ ...d, appLabel: e.target.value }))}
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {LABEL_PRESETS.map((p) => (
                        <PresetPill key={p} label={p} active={p === draft.appLabel} onClick={() => setDraft((d) => ({ ...d, appLabel: p }))} />
                      ))}
                    </div>
                    <span className="af-field-hint">A small badge next to the name.</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span className="af-field-label">Icon</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                    {ICON_IDS.map((id) => {
                      const selected = id === draft.iconId;
                      return (
                        <div
                          key={id}
                          onClick={() => setDraft((d) => ({ ...d, iconId: id }))}
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
                            <div style={{ position: 'absolute', top: 7, right: 7, width: 15, height: 15, borderRadius: '50%', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

              <BrandPreview branding={draft} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 2 }}>
              <button
                onClick={continueToSignIn}
                className="af-btn af-btn--primary"
                style={{ width: 360, height: 48, fontSize: 13.5 }}
              >
                Continue
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function BrandPreview({ branding }: { branding: Branding }) {
  return (
    <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
          Live preview
        </span>
      </div>

      <div style={{ borderRadius: 14, overflow: 'hidden', background: 'var(--navy)', padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BrandIcon id={branding.iconId} primary="rgba(255,255,255,0.85)" accent="var(--blue)" size={28} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
            <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '0.05em', color: '#fff' }}>{branding.appName}</span>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.35)', color: '#fff' }}>
              {branding.appLabel}
            </span>
          </div>
        </div>
        <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.55)' }}>Sign-in panel</span>
      </div>

      <div style={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-2)', padding: '15px 17px', display: 'flex', flexDirection: 'column', gap: 9, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <BrandIcon id={branding.iconId} primary="var(--navy)" accent="var(--blue)" size={22} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.04em' }}>{branding.appName}</span>
            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', padding: '1px 6px', borderRadius: 4, background: 'var(--blue)22', color: 'var(--blue)' }}>
              {branding.appLabel}
            </span>
          </div>
        </div>
        <span style={{ fontSize: 9.5, color: 'var(--text-3)' }}>App header — Chat, Debug, History…</span>
      </div>
    </div>
  );
}
