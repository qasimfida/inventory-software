/** Presentation only: a saved selection with readiness issues is a warning, not publication success. */
export function onlineResultTone(item: {
  ok: boolean;
  code: string;
}): 'success' | 'warning' | 'error' {
  if (item.code === 'ALREADY_LISTED') return 'warning';
  if (!item.ok) return 'error';
  return ['needs_changes', 'selected'].includes(item.code) ? 'warning' : 'success';
}
export function canReviewOnlineResult(code: string) {
  return !['REMOVED', 'delisted', 'NOT_FOUND'].includes(code);
}
