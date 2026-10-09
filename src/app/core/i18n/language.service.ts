import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Lang, LocalizedText } from '../models/localized';
import { AR } from './i18n.ar';
import { EN } from './i18n.en';

const STORAGE_KEY = 'mutqin.lang';
const DICTIONARIES: Record<Lang, unknown> = { en: EN, ar: AR };

/**
 * Holds the active language, keeps <html lang/dir> in sync for RTL,
 * and resolves translation keys such as `landing.hero.title`.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly document = inject(DOCUMENT);

  readonly lang = signal<Lang>(this.readInitialLang());
  readonly dir = computed(() => (this.lang() === 'ar' ? 'rtl' : 'ltr'));
  readonly isRtl = computed(() => this.dir() === 'rtl');

  constructor() {
    effect(() => {
      const lang = this.lang();
      const html = this.document.documentElement;
      html.lang = lang;
      html.dir = this.dir();
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch {
        /* storage unavailable (private mode) — language still works for this visit */
      }
    });
  }

  setLang(lang: Lang): void {
    this.lang.set(lang);
  }

  toggle(): void {
    this.lang.update((l) => (l === 'en' ? 'ar' : 'en'));
  }

  /** Translate a dotted key; falls back to English, then to the key itself. */
  t(key: string, params?: Record<string, string | number>): string {
    const value = lookup(DICTIONARIES[this.lang()], key) ?? lookup(EN, key) ?? key;
    return params ? interpolate(value, params) : value;
  }

  /** Pick the active language from backend-provided bilingual text. */
  pick(text: LocalizedText | null | undefined): string {
    if (!text) return '';
    return text[this.lang()] || text.en;
  }

  private readInitialLang(): Lang {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'ar') return saved;
    } catch {
      /* ignore */
    }
    return 'en';
  }
}

function lookup(dict: unknown, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in node) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof node === 'string' ? node : undefined;
}

function interpolate(text: string, params: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`));
}
