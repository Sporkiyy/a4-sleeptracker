import { Injectable, computed, inject, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { FeedbackService } from './feedback.service';
import { minutesOfDay } from '../utils/date-utils';

export type Theme = 'dark' | 'light';

/**
 * The mode the app opens in, by time of day, in minutes after midnight: light from 6:00 AM,
 * dark from 6:00 PM. Dark covers the evening wind-down, bedtime, and the night, when a bright
 * screen is least welcome; light covers the daytime check-ins, when it is easier to read in
 * bright rooms.
 */
export const LIGHT_FROM = 6 * 60;
export const DARK_FROM = 18 * 60;

/** The mode picked with the toggle, saved so the app opens in it next time. */
const STORAGE_KEY = 'sleeptracker.theme.v1';
/** Key an earlier version used for a temporary choice; no longer read. */
const OLD_KEY = 'sleeptracker.themeOverride.v1';
/** Browser/status bar color for each theme (matches --ion-background-color). */
const BAR_COLORS: Record<Theme, string> = { dark: '#0b0f1e', light: '#faf5ec' };

/** The mode the app opens in at the given time, until the person picks one. */
export function scheduledTheme(date: Date): Theme {
  const minutes = minutesOfDay(date);
  return minutes >= LIGHT_FROM && minutes < DARK_FROM ? 'light' : 'dark';
}

/**
 * Light or dark mode. Until the person picks a mode with the sun/moon toggle, the time of day
 * picks the mode the app opens in (it never switches while the app is in use). Once they pick
 * one, it is saved on the device and the app always opens in it, whatever the time.
 */
@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly feedback = inject(FeedbackService);
  private readonly current = signal<Theme>('dark');
  /** True once the person has picked a mode with the toggle (now or on an earlier visit). */
  private chosenByUser = false;

  readonly theme = this.current.asReadonly();
  readonly isDark = computed(() => this.current() === 'dark');
  /** The toggle shows the mode it switches to. */
  readonly toggleIcon = computed(() => (this.isDark() ? 'sunny-outline' : 'moon-outline'));
  readonly toggleLabel = computed(() => (this.isDark() ? 'Switch to light mode' : 'Switch to dark mode'));

  /** Applies the saved mode, or the one for the current time. Runs once at startup (see main.ts). */
  async load(): Promise<void> {
    let saved: string | null = null;
    try {
      saved = (await Preferences.get({ key: STORAGE_KEY })).value;
    } catch (err) {
      console.error('Could not load the saved theme', err);
    }
    this.chosenByUser = saved === 'light' || saved === 'dark';
    this.apply(saved === 'light' || saved === 'dark' ? saved : scheduledTheme(new Date()));
    Preferences.remove({ key: OLD_KEY }).catch(() => undefined);
    // Coming back to the app (e.g. hours later) counts as opening it, unless a mode was picked.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !this.chosenByUser) {
        this.apply(scheduledTheme(new Date()));
      }
    });
  }

  toggle(): void {
    const next: Theme = this.isDark() ? 'light' : 'dark';
    this.chosenByUser = true;
    this.apply(next);
    this.feedback.tap();
    Preferences.set({ key: STORAGE_KEY, value: next }).catch((err) => console.error('Could not save the theme', err));
  }

  private apply(theme: Theme): void {
    this.current.set(theme);
    const root = document.documentElement;
    root.classList.toggle('ion-palette-dark', theme === 'dark');
    // Native form controls and scrollbars follow the theme too.
    root.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR_COLORS[theme]);
  }
}
