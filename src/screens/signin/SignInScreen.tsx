import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBranding } from '../../branding/BrandingProvider';
import { BrandIcon } from '../../branding/icons';
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
  const [accessToken, setAccessToken] = useState('');
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
          accessToken: model.requiresCredentials ? accessToken : undefined,
          workingSpace: workingSpace || undefined,
          skills,
          effort,
        },
      },
    });
  };

  // Nothing left to redo for a restored, credential-free model — skip both steps
  // once the restore has finished landing. A model that needs a token still
  // stops on step 1 (prefilled, just missing the token) since it's never restored.
  useEffect(() => {
    if (autoRanRef.current || !restoredFromPrefs || !model || model.requiresCredentials) return;
    autoRanRef.current = true;
    setStep('setup');
  }, [restoredFromPrefs, model]);

  useEffect(() => {
    if (step !== 'setup' || !autoRanRef.current || submitting) return;
    if (!model || model.requiresCredentials) return;
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
            accessToken={accessToken}
            setAccessToken={setAccessToken}
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
