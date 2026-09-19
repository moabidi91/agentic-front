import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBranding } from '../../branding/BrandingProvider';
import { BrandIcon } from '../../branding/icons';
import type { EffortLevel, ModelOption, SkillRef } from '../../api/types';
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
  const [effort, setEffort] = useState<EffortLevel>('medium');

  const submit = () => {
    if (!model) return;
    setSubmitting(true);
    navigate('/connecting', {
      state: {
        model,
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
          />
        ) : (
          <StepSetup
            workingSpace={workingSpace}
            setWorkingSpace={setWorkingSpace}
            skills={skills}
            setSkills={setSkills}
            effort={effort}
            setEffort={setEffort}
            onBack={() => setStep('identity')}
            onSubmit={submit}
            submitting={submitting}
          />
        )}
      </div>
    </div>
  );
}
