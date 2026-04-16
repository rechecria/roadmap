/**
 * Simple utility to conditionally join classnames together
 */
export function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes
    .filter((cls): cls is string => typeof cls === 'string' && cls.length > 0)
    .join(' ')
}
