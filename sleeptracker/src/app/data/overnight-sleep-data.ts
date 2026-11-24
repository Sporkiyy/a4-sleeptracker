import { SleepData, parseStoredDate } from './sleep-data';
import { HOUR_MS, formatDuration, formatTime } from '../utils/date-utils';

/** Optional 1-5 answer to "How did you sleep?" */
export type SleepQuality = 1 | 2 | 3 | 4 | 5;

/** How an overnight log is written to device storage. */
export interface OvernightSleepJSON {
  id: string;
  loggedAt: string;
  sleepStart: string;
  sleepEnd: string;
  quality: SleepQuality | null;
}

export class OvernightSleepData extends SleepData {
  static readonly QualityLabels: Record<SleepQuality, string> = {
    1: 'Awful',
    2: 'Poor',
    3: 'Okay',
    4: 'Good',
    5: 'Great',
  };

  readonly sleepStart: Date;
  readonly sleepEnd: Date;
  /** Self-rated quality, if the person chose to give one. */
  readonly quality: SleepQuality | null;

  constructor(sleepStart: Date, sleepEnd: Date, quality: SleepQuality | null = null) {
    super();
    this.sleepStart = sleepStart;
    this.sleepEnd = sleepEnd;
    this.quality = quality;
  }

  get durationMs(): number {
    return this.sleepEnd.getTime() - this.sleepStart.getTime();
  }

  /**
   * A night is filed under the day it ends (the morning you wake up), the way most sleep
   * trackers do it. That pairs each night with the sleepiness logged the following day.
   */
  override get occurredAt(): Date {
    return this.sleepEnd;
  }

  durationString(): string {
    return formatDuration(this.durationMs);
  }

  timeRangeString(): string {
    return `${formatTime(this.sleepStart)} – ${formatTime(this.sleepEnd)}`;
  }

  qualityLabel(): string | null {
    return this.quality ? OvernightSleepData.QualityLabels[this.quality] : null;
  }

  override summaryString(): string {
    return `${this.durationString()} of sleep (${this.timeRangeString()})`;
  }

  override dateString(): string {
    // Step back 12 hours so a 1 AM bedtime still counts as the previous evening's night.
    const evening = new Date(this.sleepStart.getTime() - 12 * HOUR_MS);
    return 'Night of ' + evening.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }

  toJSON(): OvernightSleepJSON {
    return {
      id: this.id,
      loggedAt: this.loggedAt.toISOString(),
      sleepStart: this.sleepStart.toISOString(),
      sleepEnd: this.sleepEnd.toISOString(),
      quality: this.quality,
    };
  }

  /** Rebuilds an entry read from storage; returns null if the stored record is unusable. */
  static fromJSON(value: unknown): OvernightSleepData | null {
    const json = (value ?? {}) as Partial<OvernightSleepJSON>;
    const start = parseStoredDate(json.sleepStart);
    const end = parseStoredDate(json.sleepEnd);
    if (!start || !end || end <= start || typeof json.id !== 'string') {
      return null;
    }
    const quality = [1, 2, 3, 4, 5].includes(json.quality as number) ? (json.quality as SleepQuality) : null;
    const entry = new OvernightSleepData(start, end, quality);
    entry.id = json.id;
    entry.loggedAt = parseStoredDate(json.loggedAt) ?? end;
    return entry;
  }
}
