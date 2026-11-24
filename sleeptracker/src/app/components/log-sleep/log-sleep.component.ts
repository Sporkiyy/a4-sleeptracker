import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import {
  IonButton, IonButtons, IonContent, IonDatetime, IonDatetimeButton, IonFooter, IonHeader, IonIcon,
  IonPopover, IonTitle, IonToolbar, ModalController,
} from '@ionic/angular/standalone';
import { OvernightSleepData, SleepQuality } from '../../data/overnight-sleep-data';
import { SleepService } from '../../services/sleep.service';
import { FeedbackService } from '../../services/feedback.service';
import {
  HOUR_MS, MINUTE_MS, addDays, atMinutes, averageClockMinutes, datetimeEventValue, dayKey, floorMinutes,
  formatDuration, formatShortDate, minutesOfDay, relativeDayLabel, startOfDay, toLocalIso,
} from '../../utils/date-utils';

const MAX_SLEEP_HOURS = 18;
const MIN_SLEEP_MINUTES = 15;

/** Modal for logging (or editing) one night of sleep.*/
@Component({
  selector: 'app-log-sleep',
  templateUrl: './log-sleep.component.html',
  styleUrls: ['./log-sleep.component.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonFooter, IonIcon,
    IonDatetime, IonDatetimeButton, IonPopover,
  ],
})
export class LogSleepComponent implements OnInit {
  /** The night being edited, when opened from the history. */
  @Input() entry?: OvernightSleepData;
  /** Bedtime and wake-up recorded by the "Going to bed" timer. */
  @Input() start?: Date;
  @Input() end?: Date;

  private readonly sleep = inject(SleepService);
  private readonly modals = inject(ModalController);
  private readonly feedback = inject(FeedbackService);

  readonly qualityOptions: SleepQuality[] = [1, 2, 3, 4, 5];
  readonly today = dayKey(new Date());
  readonly dayFormat = { date: { weekday: 'short', month: 'short', day: 'numeric' } } as const;
  mode: 'new' | 'timer' | 'edit' = 'new';

  /** The day the person woke up. The night is filed under this day. */
  readonly wakeDay = signal(startOfDay(new Date()));
  readonly bedMinutes = signal(23 * 60 + 30);
  readonly wakeMinutes = signal(7 * 60 + 30);
  readonly quality = signal<SleepQuality | null>(null);
  readonly saving = signal(false);

  readonly wakeAt = computed(() => atMinutes(this.wakeDay(), this.wakeMinutes()));
  /**
   * People remember clock times, not dates, so only the wake-up day is asked for. A bedtime
   * later in the day than the wake-up time (11:30 PM vs 7:15 AM) must be the evening before;
   * an earlier one (1:30 AM) is after midnight on the same day. (Equal times count as the
   * same day, so an accidental instant timer reads as too short rather than 24 hours.)
   */
  readonly bedAt = computed(() => {
    const sameDay = atMinutes(this.wakeDay(), this.bedMinutes());
    return this.bedMinutes() <= this.wakeMinutes() ? sameDay : addDays(sameDay, -1);
  });
  readonly durationMs = computed(() => this.wakeAt().getTime() - this.bedAt().getTime());

  readonly error = computed(() => {
    if (this.wakeAt().getTime() > Date.now()) {
      return 'That wake-up time is in the future. Pick an earlier time or day.';
    }
    if (this.durationMs() > MAX_SLEEP_HOURS * HOUR_MS) {
      return `That's over ${MAX_SLEEP_HOURS} hours of sleep. Double-check your bedtime and wake-up time.`;
    }
    if (this.durationMs() < MIN_SLEEP_MINUTES * MINUTE_MS) {
      return `That's under ${MIN_SLEEP_MINUTES} minutes of sleep. Double-check your times.`;
    }
    return null;
  });

  /** A night already logged for the same day, which saving would replace (one night per day). */
  readonly replaces = computed(() => {
    const existing = this.sleep.overnightForDay(dayKey(this.wakeAt()));
    return existing && existing.id !== this.entry?.id ? existing : null;
  });

  readonly durationLabel = computed(() => formatDuration(this.durationMs()));
  readonly bedValue = computed(() => toLocalIso(this.bedAt()));
  readonly wakeValue = computed(() => toLocalIso(this.wakeAt()));
  readonly wakeDayValue = computed(() => dayKey(this.wakeDay()));
  readonly bedDateLabel = computed(() => formatShortDate(this.bedAt()));

  get title(): string {
    return this.mode === 'edit' ? 'Edit sleep' : this.mode === 'timer' ? 'Good morning' : 'Log sleep';
  }

  ngOnInit(): void {
    if (this.entry) {
      this.mode = 'edit';
      this.setTimes(this.entry.sleepStart, this.entry.sleepEnd);
      this.quality.set(this.entry.quality);
    } else if (this.start && this.end) {
      this.mode = 'timer';
      this.setTimes(this.start, this.end);
    } else {
      this.useTypicalNight();
    }
  }

  onBedTime(event: Event): void {
    const value = datetimeEventValue(event);
    if (value) {
      this.bedMinutes.set(minutesOfDay(value));
    }
  }

  onWakeTime(event: Event): void {
    const value = datetimeEventValue(event);
    if (value) {
      this.wakeMinutes.set(minutesOfDay(value));
    }
  }

  onWakeDay(event: Event, picker: IonPopover): void {
    const value = datetimeEventValue(event);
    if (value) {
      this.wakeDay.set(startOfDay(value));
      void picker.dismiss(); // a single tap on a day is enough; close the calendar
    }
  }

  setQuality(quality: SleepQuality): void {
    this.quality.update((current) => (current === quality ? null : quality));
    this.feedback.tap();
  }

  qualityLabel(quality: SleepQuality): string {
    return OvernightSleepData.QualityLabels[quality];
  }

  /** "today", "yesterday", or "Mon, Nov 23", for use mid-sentence. */
  dayLabel(date: Date): string {
    const label = relativeDayLabel(date);
    return label === 'Today' || label === 'Yesterday' ? label.toLowerCase() : label;
  }

  async save(): Promise<void> {
    if (this.error() || this.saving()) {
      return;
    }
    this.saving.set(true);
    const entry = new OvernightSleepData(this.bedAt(), this.wakeAt(), this.quality());
    if (this.entry) {
      entry.id = this.entry.id;
      entry.loggedAt = this.entry.loggedAt;
    }
    try {
      const undo = await this.sleep.logOvernightData(entry, { endSession: this.mode === 'timer' });
      this.feedback.success();
      await this.modals.dismiss(entry, 'saved', 'log-sleep');
      void this.feedback.toast(this.mode === 'edit' ? 'Sleep log updated' : `Logged ${entry.durationString()} of sleep`, undo);
    } catch (err) {
      console.error(err);
      this.saving.set(false);
      void this.feedback.toast("Couldn't save that night. Please try again.");
    }
  }

  async remove(): Promise<void> {
    if (!this.entry) {
      return;
    }
    const undo = await this.sleep.deleteEntry(this.entry);
    await this.modals.dismiss(null, 'deleted', 'log-sleep');
    void this.feedback.toast('Sleep log deleted', undo);
  }

  cancel(): void {
    void this.modals.dismiss(null, 'cancel', 'log-sleep');
  }

  private setTimes(start: Date, end: Date): void {
    this.wakeDay.set(startOfDay(end));
    this.wakeMinutes.set(minutesOfDay(end));
    this.bedMinutes.set(minutesOfDay(start));
  }

  /**
   * Pre-fills a typical night so most logs are a quick check rather than data entry: the
   * person's recent average bedtime, and "now" as the wake-up time when they are logging
   * first thing in the morning (otherwise their usual wake-up time).
   */
  private useTypicalNight(): void {
    const now = new Date();
    const recent = this.sleep.overnight().slice(0, 7);
    const usualBedtime = averageClockMinutes(recent.map((n) => n.sleepStart), 12) ?? 23 * 60 + 30;
    const usualWake = averageClockMinutes(recent.map((n) => n.sleepEnd), 18) ?? 7 * 60 + 30;
    const loggingOnWaking = now.getHours() >= 4 && now.getHours() < 11;
    const wake = floorMinutes(loggingOnWaking ? minutesOfDay(now) : usualWake);
    const today = startOfDay(now);
    this.bedMinutes.set(floorMinutes(usualBedtime));
    this.wakeMinutes.set(wake);
    this.wakeDay.set(atMinutes(today, wake) > now ? addDays(today, -1) : today);
  }
}
