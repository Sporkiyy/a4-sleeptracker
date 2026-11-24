import { Injectable, inject } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Confirms actions with a short toast (with an Undo button when the action changed data)
 * and a light haptic tap. Undo is used instead of "Are you sure?" dialogs, so routine
 * actions stay one tap while mistakes remain easy to reverse.
 */
@Injectable({
  providedIn: 'root'
})
export class FeedbackService {
  private readonly toasts = inject(ToastController);
  private current: HTMLIonToastElement | null = null;

  async toast(message: string, undo?: () => unknown): Promise<void> {
    const previous = this.current;
    const toast = await this.toasts.create({
      message,
      duration: undo ? 5000 : 2500,
      position: 'bottom',
      positionAnchor: 'app-tab-bar',
      swipeGesture: 'vertical',
      cssClass: 'app-toast',
      buttons: undo ? [{ text: 'Undo', handler: () => { void undo(); } }] : [],
    });
    this.current = toast;
    // Only the latest action can be undone, so replace any toast that is still showing.
    void previous?.dismiss();
    await toast.present();
  }

  /** Clears a toast that would otherwise sit on top of a newly opened screen. */
  dismissToast(): void {
    void this.current?.dismiss();
    this.current = null;
  }

  /** Light tap for selections. Haptics are unavailable in some browsers; that's fine. */
  tap(): void {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
  }

  success(): void {
    Haptics.notification({ type: NotificationType.Success }).catch(() => undefined);
  }
}
