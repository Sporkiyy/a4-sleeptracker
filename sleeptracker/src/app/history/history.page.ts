import { Component, computed, inject, signal } from '@angular/core';
import {
  ActionSheetController, IonButton, IonButtons, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonItem,
  IonItemOption, IonItemOptions, IonItemSliding, IonLabel, IonList, IonSegment, IonSegmentButton, IonTitle, IonToolbar,
} from '@ionic/angular/standalone';
import { SleepService } from '../services/sleep.service';
import { LogSheetsService } from '../services/log-sheets.service';
import { FeedbackService } from '../services/feedback.service';
import { ThemeService } from '../services/theme.service';
import { SleepData } from '../data/sleep-data';
import { OvernightSleepData } from '../data/overnight-sleep-data';
import { StanfordSleepinessData } from '../data/stanford-sleepiness-data';
import { formatLongDate, formatTime, parseDayKey, relativeDayLabel } from '../utils/date-utils';

type HistoryFilter = 'all' | 'sleep' | 'sleepiness';

/** Everything logged on one day: the night that ended that morning, then the day's check-ins. */
interface DayGroup {
  key: string;
  date: Date;
  night?: OvernightSleepData;
  checkIns: StanfordSleepinessData[];
}

@Component({
  selector: 'app-history',
  templateUrl: 'history.page.html',
  styleUrls: ['history.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonContent, IonButton, IonIcon, IonSegment, IonSegmentButton, IonLabel,
    IonList, IonItem, IonItemSliding, IonItemOptions, IonItemOption, IonFab, IonFabButton,
  ],
})
export class HistoryPage {
  readonly sleep = inject(SleepService);
  readonly theme = inject(ThemeService);
  private readonly sheets = inject(LogSheetsService);
  private readonly feedback = inject(FeedbackService);
  private readonly actionSheets = inject(ActionSheetController);

  readonly filter = signal<HistoryFilter>('all');

  /** Logs grouped by day, newest day first. */
  readonly groups = computed<DayGroup[]>(() => {
    const filter = this.filter();
    const byDay = new Map<string, DayGroup>();
    const group = (key: string) => {
      let day = byDay.get(key);
      if (!day) {
        day = { key, date: parseDayKey(key), checkIns: [] };
        byDay.set(key, day);
      }
      return day;
    };
    if (filter !== 'sleepiness') {
      this.sleep.overnight().forEach((night) => (group(night.dayKey()).night = night));
    }
    if (filter !== 'sleep') {
      // Oldest first within a day, so each day reads in order: night, morning, afternoon...
      [...this.sleep.sleepiness()].reverse().forEach((entry) => group(entry.dayKey()).checkIns.push(entry));
    }
    return [...byDay.values()].sort((a, b) => b.key.localeCompare(a.key));
  });

  setFilter(event: Event): void {
    const value = (event as CustomEvent<{ value?: string | number }>).detail.value;
    if (value === 'all' || value === 'sleep' || value === 'sleepiness') {
      this.filter.set(value);
    }
  }

  dayHeading(group: DayGroup): string {
    const relative = relativeDayLabel(group.date);
    return relative === 'Today' || relative === 'Yesterday' ? `${relative} · ${formatLongDate(group.date)}` : formatLongDate(group.date);
  }

  time(date: Date): string {
    return formatTime(date);
  }

  nightDetails(night: OvernightSleepData): string {
    const quality = night.qualityLabel();
    return quality ? `${night.timeRangeString()} · Felt ${quality.toLowerCase()}` : night.timeRangeString();
  }

  edit(entry: SleepData, slider?: IonItemSliding): void {
    void slider?.close();
    if (entry instanceof OvernightSleepData) {
      void this.sheets.openSleepLog({ entry });
    } else if (entry instanceof StanfordSleepinessData) {
      void this.sheets.openSleepinessLog({ entry });
    }
  }

  async delete(entry: SleepData): Promise<void> {
    const undo = await this.sleep.deleteEntry(entry);
    this.feedback.tap();
    void this.feedback.toast(entry instanceof OvernightSleepData ? 'Sleep log deleted' : 'Check-in deleted', undo);
  }

  async add(): Promise<void> {
    const sheet = await this.actionSheets.create({
      header: 'Add to your log',
      buttons: [
        { text: 'Overnight sleep', icon: 'moon-outline', handler: () => void this.sheets.openSleepLog() },
        { text: 'Sleepiness check-in', icon: 'pulse-outline', handler: () => void this.sheets.openSleepinessLog() },
        { text: 'Cancel', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  logNight(): void {
    void this.sheets.openSleepLog();
  }

  checkIn(): void {
    void this.sheets.openSleepinessLog();
  }
}
