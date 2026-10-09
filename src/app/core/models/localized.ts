/** Supported UI languages. */
export type Lang = 'en' | 'ar';

/** Text that the backend will return in both languages. */
export interface LocalizedText {
  en: string;
  ar: string;
}
