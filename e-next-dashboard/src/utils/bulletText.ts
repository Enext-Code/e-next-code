export const BULLET_PREFIX = '• ';

export function sanitizeBulletText(value: string | undefined | null): string {
  if (!value) return '';
  return value
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .filter((line) => line.replace(/^[•\-*]\s*/, '').trim() !== '')
    .join('\n');
}
