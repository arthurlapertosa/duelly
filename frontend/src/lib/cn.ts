/** Tiny class-name joiner. Filters falsy values and trims. */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}
