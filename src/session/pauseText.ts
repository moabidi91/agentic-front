import type { PauseReason } from '../api/types';

/** Which call the model refused, in words. The three values `GET /pause` can report (ADR-025). */
const OPERATIONS: Record<string, string> = {
  INIT: 'opening the conversation with the model',
  POST: 'sending your message to the model',
  GET: 'reading the model’s reply',
};

/** "3 minutes ago" — the pause instant said the way the banner of §7.2 says it. */
function elapsed(since: string): string {
  const started = Date.parse(since);
  if (Number.isNaN(started)) return '';
  const seconds = Math.max(0, Math.round((Date.now() - started) / 1000));
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'} ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} hour${hours === 1 ? '' : 's'} ago`;
}

/**
 * One sentence for a session paused on a 401: what was refused, with which code, and since when
 * — the three fields `GET /sessions/{sid}/pause` returns, and nothing else. Never the token.
 *
 * Shared by the banner in Chat and the credential pop-in so the two say the same thing.
 * `null` (the detail route could not be read) still produces a truthful sentence.
 */
export function pauseSentence(reason: PauseReason | null): string {
  if (!reason) return 'The session is paused: the model refused the last call for lack of valid credentials.';
  const what = OPERATIONS[reason.operation] ?? 'a call to the model';
  const code = reason.errorCode ? ` (${reason.errorCode})` : '';
  const when = elapsed(reason.since);
  return `The model refused ${what}${code}${when ? `, ${when}` : ''}. The session is paused — nothing is lost.`;
}
