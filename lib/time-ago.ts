/** "hace un momento", "hace 25 min", "hace 3 h": cuánto pasó desde `then` (ms). */
export function timeAgoEs(then: number, now: number): string {
  const minutes = Math.floor((now - then) / 60_000);
  if (minutes < 1) return "hace un momento";
  if (minutes < 60) return `hace ${minutes} min`;
  return `hace ${Math.floor(minutes / 60)} h`;
}
