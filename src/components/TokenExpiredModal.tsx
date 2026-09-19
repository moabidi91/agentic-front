import { useState } from 'react';
import { Button } from './Button';
import { TextInput, FieldLabel } from './Field';
import { useTokenExpiry } from '../session/TokenExpiryContext';
import { useSession } from '../session/SessionContext';
import { pauseSentence } from '../session/pauseText';
import { resolveCredentialFields } from '../api/credentials';
import type { CredentialField } from '../api/types';

/** Shown when the model declares nothing — the historical single-token form (api/credentials.ts). */
const IMPLICIT_FIELD: CredentialField = {
  key: 'access_token',
  label: 'Access token',
  placeholder: 'Paste a new access token',
  secret: true,
};

/**
 * §13 — the credential pop-in of a session paused on a 401 (ADR-025).
 *
 * The fields are the ones the **active model declares** (`ModelOption.credentialFields`), exactly
 * as at sign-in: this screen never guesses a provider's shape and never hardcodes a second token
 * form. Confirming posts `POST /credentials` and then `POST /sessions/{sid}/resume`, in that
 * order, through the retry `SessionContext` registered.
 *
 * "Later" closes it without doing anything: the session stays paused, the banner in Chat stays,
 * and the composer's send button re-opens this form. The user keeps reading the thread, Debug and
 * History while the session waits, which is what §7.2 asks for.
 *
 * No value typed here is logged, persisted, or put back in a field — the map dies with the render.
 */
export function TokenExpiredModal() {
  const { isExpired, reason, resolve, dismiss } = useTokenExpiry();
  const { connection } = useSession();
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  if (!isExpired) return null;

  /** Nothing typed survives a close: a new pause starts from empty fields, never from the last one. */
  const forget = () => {
    setValues({});
    setFailure(null);
  };

  const close = () => {
    forget();
    dismiss();
  };

  const declared = connection ? resolveCredentialFields(connection.model) : [];
  const fields = declared.length > 0 ? declared : [IMPLICIT_FIELD];
  const complete = fields.every((f) => (values[f.key] ?? '').trim().length > 0);

  const submit = async () => {
    setSubmitting(true);
    setFailure(null);
    try {
      await resolve(values);
      forget();
    } catch (error) {
      // Resuming with a token that is still wrong pauses the session again — a retry, not a
      // breakdown (ADR-025 §5). The form stays open and says so.
      setFailure(error instanceof Error ? error.message : 'The session could not be resumed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="af-overlay" role="dialog" aria-modal="true" aria-label="Session paused — credentials required">
      <div className="af-modal">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--amber-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth={2}>
              <path d="M12 9v4M12 17h.01M10.29 3.86l-8.18 14.14A1.5 1.5 0 003.5 20h17a1.5 1.5 0 001.39-2L13.7 3.86a1.5 1.5 0 00-2.6 0z" />
            </svg>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Session paused — new credentials needed</div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>
          {pauseSentence(reason)} Enter the values below: the session continues from where it stopped, in the
          same conversation, with the same plan.
        </div>
        {fields.map((field) => (
          <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <FieldLabel htmlFor={`pause-cred-${field.key}`}>{field.label}</FieldLabel>
            <TextInput
              id={`pause-cred-${field.key}`}
              type={field.secret === false ? 'text' : 'password'}
              value={values[field.key] ?? ''}
              onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
              placeholder={field.placeholder}
            />
          </div>
        ))}
        {failure && (
          <div style={{ fontSize: 12, color: 'var(--red)', lineHeight: 1.5 }}>
            {failure} Check the value and try again — a session stays paused as long as it takes.
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" disabled={submitting} onClick={close}>
            Later
          </Button>
          <Button variant="primary" disabled={!complete || submitting} onClick={submit}>
            {submitting ? 'Resuming…' : 'Resume session'}
          </Button>
        </div>
      </div>
    </div>
  );
}
