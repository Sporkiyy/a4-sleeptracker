/**
 * Small date helpers shared across the app. Everything works in the device's local
 * time zone, because sleep is logged in wall-clock time ("I went to bed at 11:30").
 */

export const MINUTE_MS = 60 * 1000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

const pad = (n: number) => String(n).padStart(2, '0');

/** "YYYY-MM-DD" for the local calendar day of `d`; a stable key for grouping logs by day. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Inverse of dayKey(): local midnight of that day. */
export function parseDayKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

/** Minutes since local midnight (0-1439). */
export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** The given calendar day at `minutes` after midnight. */
export function atMinutes(day: Date, minutes: number): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(minutes / 60), minutes % 60);
}

/** Rounds a minutes-of-day value down to a multiple of `step` (e.g. 7:42 -> 7:40). */
export function floorMinutes(minutes: number, step = 5): number {
  return Math.floor(minutes / step) * step;
}

/**
 * Average clock time of some dates, in minutes after midnight. Times are measured from
 * `pivotHour` so values on both sides of midnight average correctly: the average of
 * 11 PM and 1 AM is midnight, not noon.
 */
export function averageClockMinutes(dates: Date[], pivotHour: number): number | null {
  if (!dates.length) {
    return null;
  }
  const pivot = pivotHour * 60;
  const total = dates.reduce((sum, d) => sum + ((minutesOfDay(d) - pivot + 1440) % 1440), 0);
  return (total / dates.length + pivot) % 1440;
}

/** Local wall-clock ISO string with no time zone: the format ion-datetime reads and emits. */
export function toLocalIso(d: Date): string {
  return `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

/** Parses an ion-datetime value ("YYYY-MM-DD" or "YYYY-MM-DDTHH:mm[:ss]") as local time. */
export function fromLocalIso(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(value);
  if (!match) {
    return null;
  }
  const [, year, month, day, hours, minutes] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hours ?? 0), Number(minutes ?? 0));
}

/** Reads the value out of an ion-datetime ionChange event. */
export function datetimeEventValue(event: Event): Date | null {
  const value = (event as CustomEvent<{ value?: string | string[] | null }>).detail?.value;
  return typeof value === 'string' ? fromLocalIso(value) : null;
}

/* ---------- Formatting (uses the device's locale, so 12/24-hour follows the phone) ---------- */

export function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** "7h 48m", "8h", or "45m". */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / MINUTE_MS));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) {
    return `${minutes}m`;
  }
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

/** "Mon, Nov 23" */
export function formatShortDate(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** "Monday, November 23" */
export function formatLongDate(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

/** "Today", "Yesterday", or a short date. */
export function relativeDayLabel(d: Date, now = new Date()): string {
  const daysAgo = Math.round((startOfDay(now).getTime() - startOfDay(d).getTime()) / DAY_MS);
  if (daysAgo === 0) {
    return 'Today';
  }
  if (daysAgo === 1) {
    return 'Yesterday';
  }
  return formatShortDate(d);
}

export function greetingFor(d: Date): string {
  const hour = d.getHours();
  if (hour >= 5 && hour < 12) {
    return 'Good morning';
  }
  if (hour >= 12 && hour < 17) {
    return 'Good afternoon';
  }
  if (hour >= 17 && hour < 22) {
    return 'Good evening';
  }
  return 'Still up?';
}
