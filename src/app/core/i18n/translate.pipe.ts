import { Pipe, PipeTransform, inject } from '@angular/core';
import { LocalizedText } from '../models/localized';
import { LanguageService } from './language.service';

/** `{{ 'nav.home' | t }}` — UI copy from the translation dictionaries. */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(LanguageService);

  transform(key: string, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
}

/** `{{ lecture.title | loc }}` — bilingual text that comes from the backend. */
@Pipe({ name: 'loc', pure: false })
export class LocalizePipe implements PipeTransform {
  private readonly i18n = inject(LanguageService);

  transform(text: LocalizedText | null | undefined): string {
    return this.i18n.pick(text);
  }
}
