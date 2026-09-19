import { useState } from 'react';
import { Button } from './Button';
import { TextInput, FieldLabel } from './Field';
import { useTokenExpiry } from '../session/TokenExpiryContext';

/** §13 — blocking pop-in: re-enter a token, replay the last pending call, resume without losing context. */
export function TokenExpiredModal() {
  const { isExpired, resolve } = useTokenExpiry();
  const [token, setToken] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isExpired) return null;

  const submit = async () => {
    setSubmitting(true);
    try {
      await resolve();
    } finally {
      setSubmitting(false);
      setToken('');
    }
  };

  return (
    <div className="af-overlay" role="dialog" aria-modal="true" aria-label="Session expired">
      <div className="af-modal">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--amber-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth={2}>
              <path d="M12 9v4M12 17h.01M10.29 3.86l-8.18 14.14A1.5 1.5 0 003.5 20h17a1.5 1.5 0 001.39-2L13.7 3.86a1.5 1.5 0 00-2.6 0z" />
            </svg>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Your access token expired</div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>
          Enter a new access token to continue. The request you were waiting on will be replayed automatically — nothing about the conversation is lost.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <FieldLabel htmlFor="token-modal-input">Access token</FieldLabel>
          <TextInput
            id="token-modal-input"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste a new token"
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="primary" disabled={!token || submitting} onClick={submit}>
            {submitting ? 'Resuming…' : 'Resume session'}
          </Button>
        </div>
      </div>
    </div>
  );
}
