/** Relative recent activity, then unambiguous business-local date/time. */
export function notificationTime(value: string, timeZone: string, now = Date.now()) {
  const date = new Date(value),
    elapsed = Math.max(0, now - date.getTime());
  if (elapsed < 60_000) return 'Just now';
  if (elapsed < 3_600_000) {
    const n = Math.floor(elapsed / 60_000);
    return `${n} minute${n === 1 ? '' : 's'} ago`;
  }
  const day = (d: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  if (day(date) === day(new Date(now))) {
    const n = Math.floor(elapsed / 3_600_000);
    return `${n} hour${n === 1 ? '' : 's'} ago`;
  }
  if (day(date) === day(new Date(now - 86_400_000))) return 'Yesterday';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}
