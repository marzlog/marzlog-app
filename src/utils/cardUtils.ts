/**
 * Card utility functions
 */

const ACTIVITY_ICON_MAP: Record<string, string> = {
  coffee: '\u2615',
  food: '\uD83C\uDF7D\uFE0F',
  shopping: '\uD83D\uDED2',
  walking: '\uD83D\uDEB6',
  reading: '\uD83D\uDCD6',
  travel: '\u2708\uFE0F',
  beach: '\uD83C\uDFD6\uFE0F',
  sports: '\uD83D\uDCAA',
  social: '\uD83D\uDC65',
  nature: '\uD83C\uDF3F',
};

const DEFAULT_ICON = '\uD83D\uDCF7';

export function getActivityIcon(category: string | null): string {
  return category ? (ACTIVITY_ICON_MAP[category] ?? DEFAULT_ICON) : DEFAULT_ICON;
}

export function formatTime(takenAt: string | null): string {
  if (!takenAt) return '';
  const date = new Date(takenAt);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatDetailDate(takenAt: string | null): string {
  if (!takenAt) return '';
  const date = new Date(takenAt);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month} ${day}, ${year} \u00B7 ${hours}:${minutes}`;
}
