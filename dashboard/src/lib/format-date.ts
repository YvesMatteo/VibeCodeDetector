/**
 * Consistent date formatting utility
 */

export function formatDate(date: string | Date, format: 'short' | 'long' | 'relative' | 'datetime' = 'short'): string {
  const d = new Date(date);

  if (isNaN(d.getTime())) return 'Invalid date';

  switch (format) {
    case 'short':
      // "Feb 28" or "Feb 28, 2025" if not current year
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}),
      });

    case 'long':
      // "February 28, 2026 3:45 PM"
      return d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });

    case 'datetime':
      // "Feb 28, 2026 3:45 PM"
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });

    case 'relative':
      return timeAgo(d);
  }
}

function timeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return formatDate(date, 'short');
}
