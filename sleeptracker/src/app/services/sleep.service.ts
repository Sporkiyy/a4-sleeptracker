import { Injectable, computed, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { SleepData } from '../data/sleep-data';
import { OvernightSleepData } from '../data/overnight-sleep-data';
import { StanfordSleepinessData } from '../data/stanford-sleepiness-data';

/** Reverts the change that returned it. Shown to people as an "Undo" button. */
export type UndoFn = () => Promise<void>;

/**
 * Logged data lives in Capacitor Preferences: permanent key-value storage on iOS/Android
 * (UserDefaults / SharedPreferences) and localStorage in a browser. A person logs roughly
 * one night and a few check-ins a day, a few hundred small records a year, which is well
 * within what Preferences handles comfortably.
 */
const STORAGE_KEYS = {
  overnight: 'sleeptracker.overnight.v1',
  sleepiness: 'sleeptracker.sleepiness.v1',
  session: 'sleeptracker.sleepSession.v1',
} as const;
type StoredList = keyof typeof STORAGE_KEYS;

const newestFirst = (a: SleepData, b: SleepData) => b.occurredAt.getTime() - a.occurredAt.getTime();

@Injectable({
  providedIn: 'root'
})
export class SleepService {
  private readonly overnightLogs = signal<OvernightSleepData[]>([]);
  private readonly sleepinessLogs = signal<StanfordSleepinessData[]>([]);
  /** Start time of a "Going to bed" timer that is still running, if any. */
  private readonly sleepSession = signal<Date | null>(null);

  /** Overnight logs, most recent night first. */
  readonly overnight = computed(() => [...this.overnightLogs()].sort(newestFirst));
  /** Sleepiness check-ins, most recent first. */
  readonly sleepiness = computed(() => [...this.sleepinessLogs()].sort(newestFirst));
  /** Both kinds of logs in a single timeline, most recent first. */
  readonly allSleepData = computed<SleepData[]>(() => [...this.overnightLogs(), ...this.sleepinessLogs()].sort(newestFirst));
  readonly sleepStartedAt = this.sleepSession.asReadonly();
  readonly hasData = computed(() => this.overnightLogs().length > 0 || this.sleepinessLogs().length > 0);

  /** Reads everything saved on the device. Runs once at startup (see main.ts). */
  async load(): Promise<void> {
    try {
      const [overnight, sleepiness, session] = await Promise.all(
        Object.values(STORAGE_KEYS).map((key) => Preferences.get({ key }).then((result) => result.value)),
      );
      this.overnightLogs.set(parseList(overnight, OvernightSleepData.fromJSON));
      this.sleepinessLogs.set(parseList(sleepiness, StanfordSleepinessData.fromJSON));
      const started = session ? new Date(session) : null;
      this.sleepSession.set(started && !isNaN(started.getTime()) ? started : null);
    } catch (err) {
      console.error('Could not load saved sleep data', err);
    }
  }

  /** The night that ended on the given day (YYYY-MM-DD), if one was logged. */
  overnightForDay(key: string): OvernightSleepData | undefined {
    return this.overnightLogs().find((night) => night.dayKey() === key);
  }

  /** The given day's check-ins, earliest first. */
  sleepinessForDay(key: string): StanfordSleepinessData[] {
    return this.sleepiness().filter((entry) => entry.dayKey() === key).reverse();
  }

  /**
   * Saves a night. A person logs one night per day, so a night that ends on a day which
   * already has one replaces it; saving an edited entry (same id) replaces the original.
   * Pass `endSession` when the night came from the "Going to bed" timer.
   */
  async logOvernightData(entry: OvernightSleepData, { endSession = false } = {}): Promise<UndoFn> {
    const undo = this.snapshot();
    this.overnightLogs.update((list) => [...list.filter((n) => n.id !== entry.id && n.dayKey() !== entry.dayKey()), entry]);
    if (endSession) {
      this.sleepSession.set(null);
    }
    await this.persist('overnight', 'session');
    return undo;
  }

  /** Saves a sleepiness check-in, replacing the original if this is an edit (same id). */
  async logSleepinessData(entry: StanfordSleepinessData): Promise<UndoFn> {
    const undo = this.snapshot();
    this.sleepinessLogs.update((list) => [...list.filter((s) => s.id !== entry.id), entry]);
    await this.persist('sleepiness');
    return undo;
  }

  async deleteEntry(entry: SleepData): Promise<UndoFn> {
    const undo = this.snapshot();
    if (entry instanceof OvernightSleepData) {
      this.overnightLogs.update((list) => list.filter((n) => n.id !== entry.id));
      await this.persist('overnight');
    } else {
      this.sleepinessLogs.update((list) => list.filter((s) => s.id !== entry.id));
      await this.persist('sleepiness');
    }
    return undo;
  }

  /** Starts the "Going to bed" timer. It survives the app being closed overnight. */
  async startSleep(at = new Date()): Promise<UndoFn> {
    const undo = this.snapshot();
    this.sleepSession.set(at);
    await this.persist('session');
    return undo;
  }

  async cancelSleep(): Promise<UndoFn> {
    const undo = this.snapshot();
    this.sleepSession.set(null);
    await this.persist('session');
    return undo;
  }

  /** Captures the current state so a change can be undone in one tap. */
  private snapshot(): UndoFn {
    const overnight = this.overnightLogs();
    const sleepiness = this.sleepinessLogs();
    const session = this.sleepSession();
    return async () => {
      this.overnightLogs.set(overnight);
      this.sleepinessLogs.set(sleepiness);
      this.sleepSession.set(session);
      await this.persist('overnight', 'sleepiness', 'session');
    };
  }

  /** Writes the named lists to device storage (each entry serializes via its toJSON()). */
  private async persist(...lists: StoredList[]): Promise<void> {
    await Promise.all(lists.map((list) => {
      const key = STORAGE_KEYS[list];
      if (list === 'session') {
        const started = this.sleepSession();
        return started ? Preferences.set({ key, value: started.toISOString() }) : Preferences.remove({ key });
      }
      const entries = list === 'overnight' ? this.overnightLogs() : this.sleepinessLogs();
      return Preferences.set({ key, value: JSON.stringify(entries) });
    }));
  }
}

/** Parses a stored JSON array, dropping any records that fail validation. */
function parseList<T>(raw: string | null, revive: (value: unknown) => T | null): T[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(revive).filter((item): item is T => item !== null) : [];
  } catch {
    return [];
  }
}
