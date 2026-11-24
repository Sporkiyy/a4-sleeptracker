import { inject, provideAppInitializer } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { SleepService } from './app/services/sleep.service';
import { ThemeService } from './app/services/theme.service';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    // Load saved logs from device storage before the first screen renders,
    // so the app never flashes an empty state.
    provideAppInitializer(() => inject(SleepService).load()),
    // Open in the saved light/dark choice (or the one for the time of day) before the first screen renders, too.
    provideAppInitializer(() => inject(ThemeService).load()),
  ],
});
