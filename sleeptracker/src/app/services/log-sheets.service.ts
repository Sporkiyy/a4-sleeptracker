import { Injectable, Type, inject } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { LogSleepComponent } from '../components/log-sleep/log-sleep.component';
import { LogSleepinessComponent } from '../components/log-sleepiness/log-sleepiness.component';
import { OvernightSleepData } from '../data/overnight-sleep-data';
import { StanfordSleepinessData } from '../data/stanford-sleepiness-data';
import { FeedbackService } from './feedback.service';

/**
 * Opens the two logging screens. Both the Today and History tabs go through here, so
 * logging always looks and works the same wherever it starts.
 */
@Injectable({
  providedIn: 'root'
})
export class LogSheetsService {
  private readonly modals = inject(ModalController);
  private readonly feedback = inject(FeedbackService);

  /** Resolves true if the person saved. */
  openSleepLog(props: { entry?: OvernightSleepData; start?: Date; end?: Date } = {}): Promise<boolean> {
    return this.open('log-sleep', LogSleepComponent, props);
  }

  /** Resolves true if the person saved. */
  openSleepinessLog(props: { entry?: StanfordSleepinessData; level?: number } = {}): Promise<boolean> {
    return this.open('log-sleepiness', LogSleepinessComponent, props);
  }

  private async open(id: string, component: Type<unknown>, componentProps: object): Promise<boolean> {
    const top = await this.modals.getTop();
    if (top?.id === id) {
      return false; // already open (e.g. a double tap)
    }
    this.feedback.dismissToast();
    const modal = await this.modals.create({
      id,
      component,
      componentProps,
      // iOS shows a card that slides over the current screen; Android shows a full-screen sheet.
      presentingElement: (document.querySelector('ion-router-outlet') as HTMLElement | null) ?? undefined,
    });
    await modal.present();
    const { role } = await modal.onWillDismiss();
    return role === 'saved';
  }
}
