import {
  ApplicationConfig,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { TitleStrategy, provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { routes } from './app.routes';
import { APP_ICONS } from './core/icons';
import { TranslatedTitleStrategy } from './core/i18n/title.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),
    { provide: TitleStrategy, useClass: TranslatedTitleStrategy },
    importProvidersFrom(LucideAngularModule.pick(APP_ICONS)),
  ],
};
