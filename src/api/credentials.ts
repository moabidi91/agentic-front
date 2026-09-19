import type { CredentialField, ModelOption } from './types';

const IMPLICIT_TOKEN_FIELD: CredentialField = {
  key: 'access_token',
  label: 'Access token',
  placeholder: 'Paste an access token',
  secret: true,
};

/**
 * The credential fields a chosen model needs, beyond the user id — resolved
 * for both the new `credentialFields` list (contrat-interface.md §2) and a
 * backend that has only sent the older `requires_credentials` boolean
 * (treated as a single implicit, secret "Access token" field, matching the
 * app's original behavior before per-model fields existed).
 */
export function resolveCredentialFields(model: ModelOption): CredentialField[] {
  if (model.credentialFields) return model.credentialFields;
  return model.requiresCredentials ? [IMPLICIT_TOKEN_FIELD] : [];
}

/** A field with no explicit `secret` is treated as secret — fail closed for local persistence. */
export function isSecretField(field: CredentialField): boolean {
  return field.secret !== false;
}

/** True once every field the model needs (per resolveCredentialFields) has a non-empty value. */
export function hasAllRequiredCredentials(model: ModelOption | null, credentials: Record<string, string>): boolean {
  if (!model) return false;
  return resolveCredentialFields(model).every((f) => (credentials[f.key] ?? '').trim().length > 0);
}
