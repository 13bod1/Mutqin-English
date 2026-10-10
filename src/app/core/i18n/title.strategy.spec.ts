import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot } from '@angular/router';
import { TranslatedTitleStrategy } from './title.strategy';
import { LanguageService } from './language.service';

describe('TranslatedTitleStrategy', () => {
  let strategy: TranslatedTitleStrategy;
  let titleService: Title;
  let languageService: LanguageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [Title, LanguageService, TranslatedTitleStrategy],
    });
    strategy = TestBed.inject(TranslatedTitleStrategy);
    titleService = TestBed.inject(Title);
    languageService = TestBed.inject(LanguageService);
  });

  it('should create strategy and update title on route update', () => {
    expect(strategy).toBeTruthy();

    const snapshotMock = {
      root: {
        children: [],
        title: 'titles.home',
      },
    } as unknown as RouterStateSnapshot;

    spyOn(strategy, 'buildTitle').and.returnValue('titles.home');

    strategy.updateTitle(snapshotMock);
    TestBed.flushEffects();

    const currentTitle = titleService.getTitle();
    expect(currentTitle).toContain(languageService.t('brand.name'));
  });
});
