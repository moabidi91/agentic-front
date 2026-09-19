import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBranding } from '../../branding/BrandingProvider';
import { BrandIcon } from '../../branding/icons';
import { hasAllRequiredCredentials } from '../../api/credentials';
import type { EffortLevel, ModelOption, PromptRef, SkillRef } from '../../api/types';
import { isTauri, loadSignInPrefs, readPromptsFromFolder } from '../../session/signInPrefs';
import { StepIdentity } from './StepIdentity';
import { StepSetup } from './StepSetup';

type Step = 'identity' | 'setup';

export function SignInScreen() {
  const navigate = useNavigate();
  const { branding } = useBranding();
  const [step, setStep] = useState<Step>('identity');
  const [submitting, setSubmitting] = useState(false);

  const [userId, setUserId] = useState('');
  const [model, setModel] = useState<ModelOption | null>(null);
  /** Keyed by CredentialField.key — one entry per field the chosen model declares (see api/credentials.ts). */
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const setCredentialValue = (key: string, value: string) => setCredentials((prev) => ({ ...prev, [key]: value }));
  const [workingSpace, setWorkingSpace] = useState('');
  const [skills, setSkills] = useState<SkillRef[]>([]);
  const [prompts, setPrompts] = useState<PromptRef[]>([]);
  const [effort, setEffort] = useState<EffortLevel>('medium');
  const [promptsFolderPath, setPromptsFolderPath] = useState<string | undefined>();
  const [preferredModelId, setPreferredModelId] = useState<string | undefined>();
  // True only once we've actually found and applied a saved config — NOT merely
  // once the (always-run) restore attempt has finished. Auto-advance/auto-submit
  // below must never fire on a fresh install just because a user happens to pick
  // a credential-free model manually on a completely empty form.
  const [restoredFromPrefs, setRestoredFromPrefs] = useState(false);
  const autoRanRef = useRef(false);
  // Frozen snapshot of exactly what came from the file, taken once at restore
  // time — the auto-advance/auto-submit checks below read this, never the live
  // `credentials` state, so typing into a still-visible field never itself
  // triggers automation; only what was already saved can do that.
  const restoredCredentialsRef = useRef<Record<string, string>>({});

  // Restore the last successful setup (model, working folder, skills, effort,
  // prompts folder), if any — see signInPrefs.ts. Runs once on mount; the
  // access token is deliberately never restored, so a model that needs one
  // still stops here for re-entry.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadSignInPrefs();
      if (cancelled || !saved) return;
      setUserId(saved.userId);
      setPreferredModelId(saved.modelId);
      // Only ever the non-secret fields (e.g. a Chat ID) — a secret one like the
      // access token is never written to the file in the first place, so there's
      // nothing to restore for it; the user re-enters it each launch.
      if (saved.credentials) {
        setCredentials(saved.credentials);
        restoredCredentialsRef.current = saved.credentials;
      }
      setWorkingSpace(saved.workingSpace ?? '');
      setSkills(saved.skills);
      setEffort(saved.effort);
      if (isTauri && saved.promptsFolderPath) {
        try {
          const loaded = await readPromptsFromFolder(saved.promptsFolderPath);
          if (!cancelled) {
            setPrompts(loaded);
            setPromptsFolderPath(saved.promptsFolderPath);
          }
        } catch {
          // Folder may have moved or been deleted since — silently skip, the user can re-pick it.
        }
      }
      if (!cancelled) setRestoredFromPrefs(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = () => {
    if (!model) return;
    setSubmitting(true);
    navigate('/connecting', {
      state: {
        model,
        prompts,
        promptsFolderPath,
        config: {
          userId,
          modelId: model.id,
          credentials,
          workingSpace: workingSpace || undefined,
          skills,
          effort,
        },
      },
    });
  };

  // Nothing left to redo once every field the model needs was already in the
  // saved file — skip both steps once the restore has finished landing and the
  // model has resolved. Checked against the frozen restore snapshot, never the
  // live `credentials` state: typing to complete a missing (secret) field by
  // hand must never itself trigger this — only what the file already had can.
  // A field that was never restored (any secret one, e.g. the access token)
  // still stops here, prefilled otherwise, just missing that one value.
  useEffect(() => {
    if (autoRanRef.current || !restoredFromPrefs || !hasAllRequiredCredentials(model, restoredCredentialsRef.current)) return;
    autoRanRef.current = true;
    setStep('setup');
  }, [restoredFromPrefs, model]);

  useEffect(() => {
    if (step !== 'setup' || !autoRanRef.current || submitting) return;
    if (!hasAllRequiredCredentials(model, restoredCredentialsRef.current)) return;
    submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          borderRadius: 20,
          boxShadow: 'var(--shadow-lg)',
          background: 'var(--surface)',
          padding: '40px 44px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <BrandIcon id={branding.iconId} primary="var(--navy)" accent="var(--blue)" size={24} />
            <span style={{ fontSize: 14, fontWeight: 800 }}>{branding.appName}</span>
          </div>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.04em' }}>
            Step {step === 'identity' ? 1 : 2} of 2
          </span>
        </div>

        {step === 'identity' ? (
          <StepIdentity
            userId={userId}
            setUserId={setUserId}
            model={model}
            setModel={setModel}
            credentials={credentials}
            setCredentialValue={setCredentialValue}
            onContinue={() => setStep('setup')}
            preferredModelId={preferredModelId}
          />
        ) : (
          <StepSetup
            workingSpace={workingSpace}
            setWorkingSpace={setWorkingSpace}
            skills={skills}
            setSkills={setSkills}
            prompts={prompts}
            setPrompts={setPrompts}
            effort={effort}
            setEffort={setEffort}
            onPromptsFolderPicked={setPromptsFolderPath}
            onBack={() => setStep('identity')}
            onSubmit={submit}
            submitting={submitting}
          />
        )}
      </div>
    </div>
  );
}
