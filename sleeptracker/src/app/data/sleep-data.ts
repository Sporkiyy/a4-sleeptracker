import { nanoid } from 'nanoid';
import { dayKey } from '../utils/date-utils';

/**
 * Base class for everything a person can log. Overnight sleep and sleepiness check-ins
 * both extend it, so the two kinds of data can be listed together in one timeline.
 */
export class SleepData {
  id: string;
  loggedAt: Date;

  constructor() {
    // A random unique id lets the app edit, delete, and undo a specific entry.
    this.id = nanoid();
    this.loggedAt = new Date();
  }

  /** When the logged event happened; used to order a mixed timeline. */
  get occurredAt(): Date {
    return this.loggedAt;
  }

  /** The calendar day (YYYY-MM-DD) this entry is filed under in the history. */
  dayKey(): string {
    return dayKey(this.occurredAt);
  }

  summaryString(): string {
    return 'Unknown sleep data';
  }

  dateString(): string {
    return this.occurredAt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }
}

/** Parses an ISO date string from storage, rejecting anything that is not a real date. */
export function parseStoredDate(value: unknown): Date | null {
  if (typeof value !== 'string') {
    return null;
  }
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

/** Keeps only the strings from a stored array (guards against corrupted storage). */
export function parseStoredStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}
