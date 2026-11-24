/* from the Stanford Sleepiness Scale */
/* https://web.stanford.edu/~dement/sss.html */

import { SleepData, parseStoredDate, parseStoredStrings } from './sleep-data';

/** How a sleepiness check-in is written to device storage. */
export interface SleepinessJSON {
  id: string;
  loggedAt: string;
  value: number;
  context: string[];
}

export class StanfordSleepinessData extends SleepData {
  public static ScaleValues = [undefined, //Sleepiness scale starts at 1
  'Feeling active, vital, alert, or wide awake', //1
  'Functioning at high levels, but not at peak; able to concentrate', //2
  'Awake, but relaxed; responsive but not fully alert', //3
  'Somewhat foggy, let down', //4
  'Foggy; losing interest in remaining awake; slowed down', //5
  'Sleepy, woozy, fighting sleep; prefer to lie down', //6
  'No longer fighting sleep, sleep onset soon; having dream-like thoughts']; //7

  /** Short names for each level, for places where the full description will not fit. */
  public static ShortLabels = [undefined,
  'Wide awake', //1
  'Alert', //2
  'Relaxed', //3
  'A bit foggy', //4
  'Foggy', //5
  'Fighting sleep', //6
  'Nodding off']; //7

  public static readonly Levels = [1, 2, 3, 4, 5, 6, 7];

  /** The 1-7 rating. `loggedAt` (from SleepData) is when the person felt this way. */
  readonly loggedValue: number;
  /** Optional situation tags, e.g. "Before coffee" or "At work". */
  readonly context: string[];

  constructor(loggedValue: number, loggedAt: Date = new Date(), context: string[] = []) {
    super();
    this.loggedValue = loggedValue;
    this.loggedAt = loggedAt;
    this.context = context;
  }

  static labelFor(level: number): string {
    return StanfordSleepinessData.ShortLabels[level] ?? '';
  }

  static descriptionFor(level: number): string {
    return StanfordSleepinessData.ScaleValues[level] ?? '';
  }

  label(): string {
    return StanfordSleepinessData.labelFor(this.loggedValue);
  }

  override summaryString(): string {
    return this.loggedValue + ": " + StanfordSleepinessData.ScaleValues[this.loggedValue];
  }

  toJSON(): SleepinessJSON {
    return {
      id: this.id,
      loggedAt: this.loggedAt.toISOString(),
      value: this.loggedValue,
      context: this.context,
    };
  }

  /** Rebuilds a check-in read from storage; returns null if the stored record is unusable. */
  static fromJSON(value: unknown): StanfordSleepinessData | null {
    const json = (value ?? {}) as Partial<SleepinessJSON>;
    const loggedAt = parseStoredDate(json.loggedAt);
    const level = json.value;
    if (!loggedAt || typeof json.id !== 'string' || typeof level !== 'number' || !StanfordSleepinessData.Levels.includes(level)) {
      return null;
    }
    const entry = new StanfordSleepinessData(level, loggedAt, parseStoredStrings(json.context));
    entry.id = json.id;
    return entry;
  }
}
