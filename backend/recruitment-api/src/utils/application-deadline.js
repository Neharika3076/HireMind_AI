export function getApplicationDeadlineStart(now = new Date()) {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}
