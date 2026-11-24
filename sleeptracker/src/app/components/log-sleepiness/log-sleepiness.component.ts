import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import {
  IonButton, IonButtons, IonContent, IonDatetime, IonDatetimeButton, IonFooter, IonHeader, IonIcon,
  IonPopover, IonTitle, IonToolbar, ModalController,
} from '@ionic/angular/standalone';
import { StanfordSleepinessData } from '../../data/stanford-sleepiness-data';
import { SLEEPINESS_CONTEXTS, addContext } from '../../data/log-options';
import { SleepService } from '../../services/sleep.service';
import { FeedbackService } from '../../services/feedback.service';
import { MINUTE_MS, datetimeEventValue, formatTime, toLocalIso } from '../../utils/date-utils';

/** Modal for a Stanford Sleepiness Scale check-in (new or edit). */
@Component({
  selector: 'app-log-sleepiness',
  templateUrl: './log-sleepiness.component.html',
  styleUrls: ['./log-sleepiness.component.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonFooter, IonIcon,
    IonDatetime, IonDatetimeButton, IonPopover,
  ],
})
export class LogSleepinessComponent implements OnInit {
  /** The check-in being edited, when opened from the history. */
  @Input() entry?: StanfordSleepinessData;
  /** A level already chosen on the Today screen's quick scale. */
  @Input() level?: number;

  private readonly sleep = inject(SleepService);
  private readonly modals = inject(ModalController);
  private readonly feedback = inject(FeedbackService);

  readonly levels = StanfordSleepinessData.Levels;
  contextOptions: readonly string[] = SLEEPINESS_CONTEXTS;
  /** Check-ins describe how someone felt, so they can't be in the future. */
  readonly maxTime = toLocalIso(new Date());

  readonly selected = signal<number | null>(null);
  readonly when = signal(new Date());
  readonly context = signal<string[]>([]);
  readonly saving = signal(false);

  readonly whenValue = computed(() => toLocalIso(this.when()));
  /** Ask about "right now" unless the person moved the time back to log an earlier moment. */
  readonly isNow = computed(() => Date.now() - this.when().getTime() < 10 * MINUTE_MS);
  readonly saveLabel = computed(() => {
    const level = this.selected();
    if (!level) {
      return 'Choose how you feel';
    }
    return this.isEdit ? 'Save changes' : `Log ${level} · ${this.label(level)}`;
  });

  get isEdit(): boolean {
    return !!this.entry;
  }

  ngOnInit(): void {
    if (this.entry) {
      this.selected.set(this.entry.loggedValue);
      this.when.set(this.entry.loggedAt);
      // Re-adding each tag also cleans up older check-ins saved with contradicting tags.
      this.context.set(this.entry.context.reduce<string[]>((tags, tag) => addContext(tags, tag), []));
      // Tags that are no longer offered (e.g. "In class") still show, so they can be removed.
      const retired = this.context().filter((tag) => !SLEEPINESS_CONTEXTS.includes(tag));
      this.contextOptions = [...SLEEPINESS_CONTEXTS, ...retired];
    } else if (this.level && this.levels.includes(this.level)) {
      this.selected.set(this.level);
    }
  }

  label(level: number): string {
    return StanfordSleepinessData.labelFor(level);
  }

  description(level: number): string {
    return StanfordSleepinessData.descriptionFor(level);
  }

  choose(level: number): void {
    this.selected.set(level);
    this.feedback.tap();
  }

  toggleContext(item: string): void {
    // Picking a tag switches off any it contradicts (e.g. "Just woke up" and "At work").
    this.context.update((list) => (list.includes(item) ? list.filter((c) => c !== item) : addContext(list, item)));
    this.feedback.tap();
  }

  onWhen(event: Event): void {
    const value = datetimeEventValue(event);
    if (value) {
      this.when.set(value);
    }
  }

  async save(): Promise<void> {
    const level = this.selected();
    if (!level || this.saving()) {
      return;
    }
    this.saving.set(true);
    const entry = new StanfordSleepinessData(level, this.when(), this.context());
    if (this.entry) {
      entry.id = this.entry.id;
    }
    try {
      const undo = await this.sleep.logSleepinessData(entry);
      this.feedback.success();
      await this.modals.dismiss(entry, 'saved', 'log-sleepiness');
      const message = this.isEdit
        ? 'Check-in updated'
        : `Logged ${level} · ${this.label(level)} at ${formatTime(entry.loggedAt)}`;
      void this.feedback.toast(message, undo);
    } catch (err) {
      console.error(err);
      this.saving.set(false);
      void this.feedback.toast("Couldn't save that check-in. Please try again.");
    }
  }

  async remove(): Promise<void> {
    if (!this.entry) {
      return;
    }
    const undo = await this.sleep.deleteEntry(this.entry);
    await this.modals.dismiss(null, 'deleted', 'log-sleepiness');
    void this.feedback.toast('Check-in deleted', undo);
  }

  cancel(): void {
    void this.modals.dismiss(null, 'cancel', 'log-sleepiness');
  }
}
