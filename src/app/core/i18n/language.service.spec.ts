import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { LanguageService } from './language.service';

describe('LanguageService', () => {
  let service: LanguageService;
  let doc: Document;

  beforeEach(() => {
    localStorage.removeItem('mutqin.lang');
    TestBed.configureTestingModule({});
    service = TestBed.inject(LanguageService);
    doc = TestBed.inject(DOCUMENT);
  });

  afterEach(() => {
    localStorage.removeItem('mutqin.lang');
  });

  it('should be created and default to English', () => {
    expect(service).toBeTruthy();
    expect(service.lang()).toBe('en');
    expect(service.dir()).toBe('ltr');
    expect(service.isRtl()).toBeFalse();
  });

  it('should set language to ar and update direction signals', () => {
    service.setLang('ar');
    expect(service.lang()).toBe('ar');
    expect(service.dir()).toBe('rtl');
    expect(service.isRtl()).toBeTrue();
  });

  it('should toggle language back and forth', () => {
    expect(service.lang()).toBe('en');
    service.toggle();
    expect(service.lang()).toBe('ar');
    service.toggle();
    expect(service.lang()).toBe('en');
  });

  it('should translate dotted keys correctly', () => {
    const brandEn = service.t('brand.name');
    expect(brandEn).toBeTruthy();
    expect(typeof brandEn).toBe('string');

    service.setLang('ar');
    const brandAr = service.t('brand.name');
    expect(brandAr).toBeTruthy();

    // Fallback test
    const missing = service.t('non.existent.key.xyz');
    expect(missing).toBe('non.existent.key.xyz');
  });

  it('should interpolate translation params', () => {
    const translated = service.t('footer.rights', { year: 2026 });
    expect(translated).toContain('2026');
  });

  it('should pick localized text according to active language', () => {
    const locText = { en: 'Hello World', ar: 'مرحبا بالعالم' };
    expect(service.pick(locText)).toBe('Hello World');

    service.setLang('ar');
    expect(service.pick(locText)).toBe('مرحبا بالعالم');

    expect(service.pick(null)).toBe('');
    expect(service.pick(undefined)).toBe('');
  });
});
