import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBranding, type Branding } from '../branding/BrandingProvider';
import { BrandIcon } from '../branding/icons';
import { IdentityFields } from '../branding/IdentityFields';
import { Spinner } from '../components/Spinner';

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
              <div style={{ flexGrow: 1, minWidth: 320 }}>
                <IdentityFields value={draft} onChange={setDraft} />
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
