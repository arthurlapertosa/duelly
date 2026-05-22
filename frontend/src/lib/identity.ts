/**
 * Friendly-identity helpers.
 *
 * Backend only gives us an email-style `displayIdentifier`; there is no
 * dedicated display-name field. Rather than surface a raw email as a big
 * heading, we derive a human-friendly name and an avatar initial from the
 * local-part. A real display name is a backend follow-up.
 */

/** Derives a friendly display name from an email-style identifier. */
export function friendlyName(identifier: string | null | undefined): string {
  if (!identifier) return '';
  const localPart = identifier.split('@')[0] ?? identifier;
  const cleaned = localPart.replace(/[._-]+/g, ' ').trim();
  if (!cleaned) return localPart;
  return cleaned
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Derives a 1-2 character avatar initial from an email-style identifier. */
export function avatarInitial(identifier: string | null | undefined): string {
  const name = friendlyName(identifier);
  if (!name) return '?';
  const words = name.split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
