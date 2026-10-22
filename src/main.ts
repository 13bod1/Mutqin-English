import { registerLocaleData } from '@angular/common';
import localeAr from '@angular/common/locales/ar';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Arabic dates (month/day names) for DatePipe when the UI language is Arabic.
registerLocaleData(localeAr, 'ar');

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
