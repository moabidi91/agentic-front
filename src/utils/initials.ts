/**
 * Derives a two-letter avatar initial pair from a user id, e.g. "jdupont" -> "JD",
 * "john.dupont" -> "JD", "j_dupont" -> "JD", "hama local" -> "HL".
 *
 * Rule: first letter of the id, plus the first letter after a '.', '_', '-' or
 * whitespace separator if one exists — otherwise the second letter of the id.
 */
export function getInitials(userId: string | null | undefined): string {
  const trimmed = (userId ?? '').trim();
  if (!trimmed) return '?';

  const sepMatch = trimmed.match(/[._\-\s]/);
  if (sepMatch && sepMatch.index !== undefined) {
    const first = trimmed[0];
    const rest = trimmed.slice(sepMatch.index + 1).trimStart();
    const second = rest[0];
    if (first && second) return (first + second).toUpperCase();
  }

  return trimmed.slice(0, 2).toUpperCase() || '?';
}
