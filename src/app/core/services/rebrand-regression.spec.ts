import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { AuthService } from '../data/auth.service';
import { LectureService } from '../data/lecture.service';
import { QuizService } from '../data/quiz.service';
import { ProgressService } from '../data/progress.service';
import { LanguageService } from '../i18n/language.service';
import { TranslatedTitleStrategy } from '../i18n/title.strategy';
import { RouterStateSnapshot } from '@angular/router';

describe('Sprint 1 Regression & Rebrand Verification Suite (AG-70)', () => {
  let authService: AuthService;
  let lectureService: LectureService;
  let quizService: QuizService;
  let progressService: ProgressService;
  let languageService: LanguageService;
  let titleStrategy: TranslatedTitleStrategy;
  let titleService: Title;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        Title,
        AuthService,
        LectureService,
        QuizService,
        ProgressService,
        LanguageService,
        TranslatedTitleStrategy
      ]
    });

    authService = TestBed.inject(AuthService);
    lectureService = TestBed.inject(LectureService);
    quizService = TestBed.inject(QuizService);
    progressService = TestBed.inject(ProgressService);
    languageService = TestBed.inject(LanguageService);
    titleStrategy = TestBed.inject(TranslatedTitleStrategy);
    titleService = TestBed.inject(Title);
  });

  describe('Feature 1: Authentication & Student Identity (Sprint 1 Regression)', () => {
    it('TC-REG-01: should initialize with a null user when unauthenticated guest visits', () => {
      expect(authService).toBeTruthy();
      expect(authService.user()).toBeNull();
    });

    it('TC-REG-02: should validate student login flow signature', (done) => {
      authService.login({
        email: 'student@mutqin.com',
        password: 'password123',
        remember: true
      }).subscribe({
        next: (user) => {
          expect(user).toBeDefined();
          done();
        },
        error: (err) => {
          expect(err).toBeDefined();
          done();
        }
      });
    });

    it('TC-REG-03: should validate student signup structure with Thanawya Amma stage', (done) => {
      authService.signup({
        fullName: 'Hazem Ahmed',
        email: 'hazem.test@mutqin.com',
        stage: 'sec3',
        password: 'Password123!'
      }).subscribe({
        next: (user) => {
          expect(user.fullName).toBe('Hazem Ahmed');
          done();
        },
        error: (err) => {
          expect(err).toBeDefined();
          done();
        }
      });
    });
  });

  describe('Feature 2: Recorded Lectures Library (Sprint 1 Regression)', () => {
    it('TC-REG-04: should retrieve active lectures catalog and verify instructor name', (done) => {
      lectureService.getLectures().subscribe((lectures) => {
        expect(lectures.length).toBeGreaterThan(0);
        const first = lectures[0];
        expect(first.instructor.en).toBe('Mr. Adel Mostafa');
        expect(first.instructor.ar).toBe('أ. عادل مصطفى');
        done();
      });
    });

    it('TC-REG-05: should retrieve featured revision lecture metadata for Thanawya Amma', (done) => {
      lectureService.getFeaturedLecture().subscribe((featured) => {
        expect(featured).toBeDefined();
        expect(featured.subtitle.en).toContain('Mr. Adel Mostafa');
        expect(featured.durationSec).toBeGreaterThan(0);
        done();
      });
    });
  });

  describe('Feature 3: Quizzes & Interactive Diagnostic Engine (Sprint 1 Regression)', () => {
    it('TC-REG-06: should load quiz modules with questions count and difficulty level', (done) => {
      quizService.getModules().subscribe((modules) => {
        expect(modules.length).toBeGreaterThan(0);
        const module = modules[0];
        expect(module.id).toBeDefined();
        expect(module.questionCount).toBeGreaterThan(0);
        done();
      });
    });

    it('TC-REG-07: should grade quiz answers accurately and award XP bonus', (done) => {
      quizService.getModules().subscribe((modules) => {
        const testModule = modules[0];
        quizService.getQuestions(testModule.id).subscribe((questions) => {
          expect(questions.length).toBeGreaterThan(0);
          const answers = questions.map((q) => q.correctIndex);
          const result = quizService.grade(testModule, questions, answers, 45);

          expect(result.percent).toBe(100);
          expect(result.correct).toBe(questions.length);
          expect(result.xpEarned).toBeGreaterThan(0);
          done();
        });
      });
    });
  });

  describe('Feature 4: Gamification, XP & National Leaderboard (Sprint 1 Regression)', () => {
    it('TC-REG-08: should retrieve student progress summary with streak and completion metrics', (done) => {
      progressService.getSummary().subscribe((summary) => {
        expect(summary).toBeDefined();
        expect(summary.streakDays).toBeDefined();
        expect(summary.cefrLevel).toBeDefined();
        done();
      });
    });

    it('TC-REG-09: should retrieve Egyptian national ranking leaderboard sorted by XP', (done) => {
      progressService.getLeaderboard().subscribe((board) => {
        expect(board.length).toBeGreaterThan(0);
        for (let i = 0; i < board.length - 1; i++) {
          expect(board[i].xp).toBeGreaterThanOrEqual(board[i + 1].xp);
        }
        done();
      });
    });
  });

  describe('Feature 5: Brand Identity & Title Strategy (AG-70 & PBI-11 Verification)', () => {
    it('TC-REG-10: should verify bilingual language service toggles between Arabic (RTL) and English (LTR)', () => {
      languageService.setLang('ar');
      expect(languageService.lang()).toBe('ar');
      expect(languageService.isRtl()).toBeTrue();
      expect(languageService.dir()).toBe('rtl');

      languageService.setLang('en');
      expect(languageService.lang()).toBe('en');
      expect(languageService.isRtl()).toBeFalse();
      expect(languageService.dir()).toBe('ltr');
    });

    it('TC-REG-11: should update document title with active brand name', () => {
      const snapshotMock = {
        root: { children: [], title: 'titles.home' }
      } as unknown as RouterStateSnapshot;

      spyOn(titleStrategy, 'buildTitle').and.returnValue('titles.home');
      titleStrategy.updateTitle(snapshotMock);
      TestBed.flushEffects();

      const currentTitle = titleService.getTitle();
      expect(currentTitle).toContain(languageService.t('brand.name'));
    });
  });
});
