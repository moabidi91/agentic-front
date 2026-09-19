import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../api/context';
import { hasAllRequiredCredentials, resolveCredentialFields } from '../../api/credentials';
import type { ModelOption } from '../../api/types';
import { Badge } from '../../components/Badge';
import { FieldHint, FieldLabel, TextInput } from '../../components/Field';
import { Spinner } from '../../components/Spinner';

export function StepIdentity({
  userId,
  setUserId,
  model,
  setModel,
  credentials,
  setCredentialValue,
  onContinue,
  preferredModelId,
}: {
  userId: string;
  setUserId: (v: string) => void;
  model: ModelOption | null;
  setModel: (m: ModelOption) => void;
  /** Keyed by CredentialField.key — one entry per field the chosen model declares (see api/credentials.ts). */
  credentials: Record<string, string>;
  setCredentialValue: (key: string, value: string) => void;
  onContinue: () => void;
  /** Last successfully-used model id, restored from signInPrefs.ts — auto-selected once the model list loads. */
  preferredModelId?: string;
}) {
  const api = useApi();
  const navigate = useNavigate();
  const [models, setModels] = useState<ModelOption[] | null>(null);
  const [autoDetected, setAutoDetected] = useState(false);

  useEffect(() => {
    api.whoAmI().then((who) => {
      if (!userId) {
        setUserId(who.userId);
        setAutoDetected(true);
      }
    });
    api.listModels().then(setModels);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Separate from the effect above so it re-checks regardless of which of the two
  // (model list vs. restored prefs) finishes loading first — no ordering assumption.
  // A saved model this process no longer serves is not restored: it would only be a card the
  // user cannot use, with the Continue button stuck (ADR-024 §2).
  useEffect(() => {
    if (!models || !preferredModelId || model) return;
    const match = models.find((m) => m.id === preferredModelId);
    if (match && match.active !== false) setModel(match);
  }, [models, preferredModelId, model, setModel]);

  const canContinue = userId.trim().length > 0 && model !== null && hasAllRequiredCredentials(model, credentials);
  const fields = model ? resolveCredentialFields(model) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <FieldLabel htmlFor="userid">User ID</FieldLabel>
          {autoDetected && userId && <Badge bg="var(--green-soft)" color="var(--green)">Auto-detected</Badge>}
        </div>
        <TextInput
          id="userid"
          value={userId}
          onChange={(e) => {
            setUserId(e.target.value);
            setAutoDetected(false);
          }}
          placeholder="e.g. hama.local"
        />
        <FieldHint>Becomes the identifier for this conversation.</FieldHint>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <FieldLabel>Model</FieldLabel>
        {models === null ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0' }}>
            <Spinner size={18} />
            <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>Loading available models…</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {models.map((m) => {
              const selected = model?.id === m.id;
              // One model per process (ADR-024 §2): only the active profile can open a session,
              // and signing in with another is refused before any request. The card says so here
              // rather than letting the user find out at the last click.
              const unavailable = m.active === false;
              return (
                <button
                  key={m.id}
                  onClick={() => setModel(m)}
                  disabled={unavailable}
                  aria-disabled={unavailable}
                  className="af-card"
                  style={{
                    textAlign: 'left',
                    padding: '13px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    borderColor: selected ? 'var(--navy)' : 'var(--border)',
                    background: selected ? 'var(--surface-2)' : 'var(--surface)',
                    opacity: unavailable ? 0.55 : 1,
                    cursor: unavailable ? 'not-allowed' : 'pointer',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                      {m.provider} · {m.codec}
                    </div>
                    {unavailable && (
                      <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.45 }}>
                        One model per process: this machine serves the profile at the top. Using this one means
                        restarting the application.
                      </div>
                    )}
                  </div>
                  {unavailable ? (
                    <Badge bg="var(--surface-2)" color="var(--text-3)">Not served here</Badge>
                  ) : m.requiresCredentials ? (
                    <Badge bg="var(--amber-soft)" color="var(--amber)">Token required</Badge>
                  ) : (
                    <Badge bg="var(--green-soft)" color="var(--green)">No credentials</Badge>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {model &&
        (fields.length > 0 ? (
          fields.map((field) => (
            <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <FieldLabel htmlFor={`cred-${field.key}`}>{field.label}</FieldLabel>
              <TextInput
                id={`cred-${field.key}`}
                type={field.secret === false ? 'text' : 'password'}
                value={credentials[field.key] ?? ''}
                onChange={(e) => setCredentialValue(field.key, e.target.value)}
                placeholder={field.placeholder}
              />
            </div>
          ))
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>
            This model manages its own authentication.
          </div>
        ))}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <button onClick={() => navigate('/welcome')} className="af-btn af-btn--ghost" style={{ paddingLeft: 0 }}>
          ← Back to Welcome
        </button>
        <button className="af-btn af-btn--primary" disabled={!canContinue} onClick={onContinue}>
          Continue
        </button>
      </div>
    </div>
  );
}
