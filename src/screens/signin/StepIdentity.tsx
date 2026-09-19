import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../api/context';
import type { ModelOption } from '../../api/types';
import { Badge } from '../../components/Badge';
import { FieldHint, FieldLabel, TextInput } from '../../components/Field';
import { Spinner } from '../../components/Spinner';

export function StepIdentity({
  userId,
  setUserId,
  model,
  setModel,
  accessToken,
  setAccessToken,
  onContinue,
}: {
  userId: string;
  setUserId: (v: string) => void;
  model: ModelOption | null;
  setModel: (m: ModelOption) => void;
  accessToken: string;
  setAccessToken: (v: string) => void;
  onContinue: () => void;
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

  const canContinue = userId.trim().length > 0 && model !== null && (!model.requiresCredentials || accessToken.trim().length > 0);

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
              return (
                <button
                  key={m.id}
                  onClick={() => setModel(m)}
                  className="af-card"
                  style={{
                    textAlign: 'left',
                    padding: '13px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderColor: selected ? 'var(--navy)' : 'var(--border)',
                    background: selected ? 'var(--surface-2)' : 'var(--surface)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                      {m.provider} · {m.codec}
                    </div>
                  </div>
                  {m.requiresCredentials ? (
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
        (model.requiresCredentials ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <FieldLabel htmlFor="token">Access token</FieldLabel>
            <TextInput
              id="token"
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="Paste an access token"
            />
          </div>
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
