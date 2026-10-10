import { TestBed } from '@angular/core/testing';
import { LocalizePipe, TranslatePipe } from './translate.pipe';
import { LanguageService } from './language.service';

describe('TranslatePipe & LocalizePipe', () => {
  let languageService: LanguageService;
  let translatePipe: TranslatePipe;
  let localizePipe: LocalizePipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LanguageService, TranslatePipe, LocalizePipe],
    });
    languageService = TestBed.inject(LanguageService);
    translatePipe = TestBed.inject(TranslatePipe);
    localizePipe = TestBed.inject(LocalizePipe);
  });

  it('TranslatePipe should translate key via LanguageService', () => {
    const result = translatePipe.transform('brand.name');
    expect(result).toBe(languageService.t('brand.name'));
  });

  it('TranslatePipe should handle params', () => {
    const result = translatePipe.transform('footer.rights', { year: 2026 });
    expect(result).toContain('2026');
  });

  it('LocalizePipe should pick text based on active language', () => {
    const text = { en: 'English Title', ar: 'عنوان عربي' };
    expect(localizePipe.transform(text)).toBe('English Title');

    languageService.setLang('ar');
    expect(localizePipe.transform(text)).toBe('عنوان عربي');
  });

  it('LocalizePipe should return empty string for null or undefined', () => {
    expect(localizePipe.transform(null)).toBe('');
    expect(localizePipe.transform(undefined)).toBe('');
  });
});
