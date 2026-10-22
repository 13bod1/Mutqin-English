import { LanguageService } from '../../core/i18n/language.service';
import { Access } from '../../core/models/commerce';

export function accessLabel(i18n: LanguageService, a: Access): string {
  if (a.type === 'paid') return i18n.t('access.price', { n: a.priceEgp ?? 0 });
  return i18n.t(a.type === 'free' ? 'access.free' : 'access.included');
}

export function accessTone(a: Access): string {
  if (a.type === 'paid') return 'tone-gold';
  return a.type === 'free' ? 'tone-success' : 'tone-brand';
}
