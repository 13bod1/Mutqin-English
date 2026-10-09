import { Injectable, effect, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { LanguageService } from './language.service';

/** Route `title` values are translation keys; the tab title follows the active language. */
@Injectable({ providedIn: 'root' })
export class TranslatedTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly i18n = inject(LanguageService);
  private readonly key = signal<string | undefined>(undefined);

  constructor() {
    super();
    effect(() => {
      const key = this.key();
      const brand = this.i18n.t('brand.name');
      this.title.setTitle(key ? `${this.i18n.t(key)} · ${brand}` : brand);
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.key.set(this.buildTitle(snapshot));
  }
}
