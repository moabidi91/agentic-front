import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBranding } from '../branding/BrandingProvider';
import { BrandIcon } from '../branding/icons';
import { useSession } from '../session/SessionContext';
import { Spinner } from '../components/Spinner';
import type { ModelOption, PromptRef, SignInConfig } from '../api/types';

type StepState = 'pending' | 'active' | 'done';

const STEPS = ['Validating access token', 'Creating session', 'First call to the model'];

const GUIDE_CARDS = [
  {
    title: 'What this app is',
    body: 'A local console that talks to your agentic-local-app backend — ask questions in Chat, or watch exactly what the model is doing in Debug.',
  },
  {
    title: 'Two views, one session',
    body: 'Chat is the everyday view: ask, get an answer. Debug shows the full live state — conversation, plan, tasks, raw protocol — switching never loses your place.',
  },
  {
    title: 'Why traceability matters',
    body: 'Every action the model takes goes through a strict protocol, and every event is logged and hash-chained. Nothing runs invisibly.',
  },
  {
    title: 'Conversation states, at a glance',
    body: 'NEW → ACTIVE → RUNNING_PLAN → READY → COMPLETED is the nominal path — and any active state can drop into INTERRUPTED if you hit Stop.',
  },
  {
    title: 'Control, built in',
    body: 'Interrupt at any moment, a diagram view of the plan, a hash-chained audit log, and a name/icon you chose yourself.',
  },
  {
    title: 'The full reference',
    body: 'This carousel is a simplified teaser. Open State machine reference from the user menu anytime for the exact, complete picture.',
  },
];

export function ConnectingScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { branding } = useBranding();
  const { signIn, isFirstRun, markConnectedOnce } = useSession();
  const [stepIndex, setStepIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [cardIndex, setCardIndex] = useState(0);

  const state = location.state as { config?: SignInConfig; model?: ModelOption; prompts?: PromptRef[] } | null;

  useEffect(() => {
    if (!state?.config || !state?.model) {
      navigate('/signin', { replace: true });
      return;
    }

    // Note: this intentionally restarts cleanly under React 18 StrictMode's
    // dev-only mount→cleanup→mount — `cancelled` discards the first pass's
    // stale updates and the second pass runs the real sequence to completion.
    let cancelled = false;
    (async () => {
      setStepIndex(0);
      await new Promise((r) => setTimeout(r, 450));
      if (cancelled) return;
      setStepIndex(1);
      await new Promise((r) => setTimeout(r, 350));
      if (cancelled) return;
      try {
        await signIn(state.config!, state.model!, state.prompts ?? []);
        if (cancelled) return;
        setStepIndex(2);
        await new Promise((r) => setTimeout(r, 400));
        if (cancelled) return;
        setReady(true);
      } catch (err) {
        if (!cancelled) setFailed(err instanceof Error ? err.message : 'Could not connect.');
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isFirstRun || !ready) return;
    const t = setInterval(() => setCardIndex((i) => (i + 1) % GUIDE_CARDS.length), 5500);
    return () => clearInterval(t);
  }, [isFirstRun, ready]);

  const continueToChat = () => {
    markConnectedOnce();
    navigate('/chat', { replace: true });
  };

  const stepState = (i: number): StepState => (i < stepIndex || (i === stepIndex && ready) ? 'done' : i === stepIndex ? 'active' : 'pending');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
      <div
        style={{
          width: '100%',
          maxWidth: isFirstRun ? 880 : 420,
          borderRadius: 20,
          boxShadow: 'var(--shadow-lg)',
          background: 'var(--surface)',
          padding: '40px 44px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <BrandIcon id={branding.iconId} primary="var(--navy)" accent="var(--blue)" size={24} />
          <span style={{ fontSize: 14, fontWeight: 800 }}>{branding.appName}</span>
        </div>

        {failed ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--red)' }}>Connection failed</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{failed}</div>
            <button className="af-btn af-btn--secondary" onClick={() => navigate('/signin')}>
              Back to Sign in
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 340 }}>
              {STEPS.map((label, i) => {
                const st = stepState(i);
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: st === 'done' ? 'var(--green-soft)' : 'transparent',
                        border: st === 'pending' ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      {st === 'done' && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth={3}>
                          <path d="M4 12l5 5L20 6" />
                        </svg>
                      )}
                      {st === 'active' && <Spinner size={16} />}
                    </div>
                    <span style={{ fontSize: 12.5, fontWeight: st === 'pending' ? 500 : 700, color: st === 'pending' ? 'var(--text-3)' : 'var(--text)' }}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>

            {isFirstRun && ready && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center' }}>
                <div
                  className="af-card"
                  style={{
                    width: '100%',
                    minHeight: 150,
                    padding: '24px 28px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: 10,
                    position: 'relative',
                  }}
                >
                  <button
                    aria-label="Previous"
                    onClick={() => setCardIndex((i) => (i - 1 + GUIDE_CARDS.length) % GUIDE_CARDS.length)}
                    style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-3)' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 18l-6-6 6-6" /></svg>
                  </button>
                  <div style={{ textAlign: 'center', padding: '0 30px' }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>{GUIDE_CARDS[cardIndex].title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55 }}>{GUIDE_CARDS[cardIndex].body}</div>
                  </div>
                  <button
                    aria-label="Next"
                    onClick={() => setCardIndex((i) => (i + 1) % GUIDE_CARDS.length)}
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-3)' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 18l6-6-6-6" /></svg>
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {GUIDE_CARDS.map((_, i) => (
                    <button
                      key={i}
                      aria-label={`Go to card ${i + 1}`}
                      onClick={() => setCardIndex(i)}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        border: 'none',
                        background: i === cardIndex ? 'var(--navy)' : 'var(--border)',
                      }}
                    />
                  ))}
                </div>
                <button className="af-btn af-btn--primary" style={{ width: 220 }} onClick={continueToChat}>
                  Continue to chat
                </button>
              </div>
            )}

            {!isFirstRun && ready && (
              <button className="af-btn af-btn--primary" style={{ width: 220 }} onClick={continueToChat}>
                Continue to chat
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
