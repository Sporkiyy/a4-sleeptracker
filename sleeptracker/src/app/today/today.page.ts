import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import {
  IonButton, IonButtons, IonCard, IonCardContent, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar,
} from '@ionic/angular/standalone';
import { SleepService } from '../services/sleep.service';
import { LogSheetsService } from '../services/log-sheets.service';
import { FeedbackService } from '../services/feedback.service';
import { ThemeService } from '../services/theme.service';
import { OvernightSleepData } from '../data/overnight-sleep-data';
import { StanfordSleepinessData } from '../data/stanford-sleepiness-data';
import { HOUR_MS, dayKey, formatDuration, formatLongDate, formatTime, greetingFor } from '../utils/date-utils';

@Component({
  selector: 'app-today',
  templateUrl: 'today.page.html',
  styleUrls: ['today.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonContent, IonCard, IonCardContent, IonButton, IonIcon],
})
export class TodayPage implements OnInit, OnDestroy {
  private readonly sleep = inject(SleepService);
  private readonly sheets = inject(LogSheetsService);
  private readonly feedback = inject(FeedbackService);
  readonly theme = inject(ThemeService);

  readonly levels = StanfordSleepinessData.Levels;
  /** Ticks every 30 seconds so the sleep timer and greeting stay current. */
  readonly now = signal(new Date());
  private clock?: ReturnType<typeof setInterval>;

  readonly greeting = computed(() => greetingFor(this.now()));
  readonly dateLabel = computed(() => formatLongDate(this.now()));
  /** The night that ended this morning. */
  readonly lastNight = computed(() => this.sleep.overnightForDay(dayKey(this.now())));
  readonly todaysCheckIns = computed(() => this.sleep.sleepinessForDay(dayKey(this.now())));

  readonly sleepingSince = this.sleep.sleepStartedAt;
  readonly elapsedMs = computed(() => {
    const since = this.sleepingSince();
    return since ? Math.max(0, this.now().getTime() - since.getTime()) : 0;
  });
  /** A timer running this long was probably left on by accident. */
  readonly timerLooksForgotten = computed(() => this.elapsedMs() > 16 * HOUR_MS);

  ngOnInit(): void {
    this.clock = setInterval(() => this.now.set(new Date()), 30 * 1000);
  }

  ionViewWillEnter(): void {
    this.now.set(new Date());
  }

  ngOnDestroy(): void {
    clearInterval(this.clock);
  }

  time(date: Date): string {
    return formatTime(date);
  }

  duration(ms: number): string {
    return formatDuration(ms);
  }

  label(level: number): string {
    return StanfordSleepinessData.labelFor(level);
  }

  nightDetails(night: OvernightSleepData): string {
    const quality = night.qualityLabel();
    return quality ? `${night.timeRangeString()} · Felt ${quality.toLowerCase()}` : night.timeRangeString();
  }

  async startSleep(): Promise<void> {
    const undo = await this.sleep.startSleep();
    this.feedback.success();
    void this.feedback.toast(`Sleep timer started at ${formatTime(new Date())}. Sleep well!`, undo);
  }

  async wakeUp(): Promise<void> {
    const start = this.sleepingSince();
    if (start) {
      this.feedback.tap();
      await this.sheets.openSleepLog({ start, end: new Date() });
    }
  }

  async cancelSleep(): Promise<void> {
    const undo = await this.sleep.cancelSleep();
    void this.feedback.toast('Sleep timer canceled', undo);
  }

  logNight(): void {
    void this.sheets.openSleepLog();
  }

  editNight(night: OvernightSleepData): void {
    void this.sheets.openSleepLog({ entry: night });
  }

  checkIn(level?: number): void {
    this.feedback.tap();
    void this.sheets.openSleepinessLog({ level });
  }

  editCheckIn(entry: StanfordSleepinessData): void {
    void this.sheets.openSleepinessLog({ entry });
  }
}
