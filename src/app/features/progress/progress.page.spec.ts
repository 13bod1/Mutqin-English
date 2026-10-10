import { ComponentFixture, TestBed } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ProgressPage } from './progress.page';
import { ProgressService } from '../../core/data/progress.service';
import { LanguageService } from '../../core/i18n/language.service';

describe('ProgressPage', () => {
  let component: ProgressPage;
  let fixture: ComponentFixture<ProgressPage>;
  let progressServiceMock: any;

  beforeEach(async () => {
    progressServiceMock = {
      getProfile: jasmine.createSpy('getProfile').and.returnValue(of({
        fullName: { en: 'Adel Mostafa', ar: 'عادل مصطفى' },
        initials: 'AM',
        stage: { en: 'Secondary Grade 3', ar: 'الصف الثالث الثانوي' },
        goal: { en: 'Top Score', ar: 'الدرجة النهائية' },
        city: { en: 'Cairo', ar: 'القاهرة' },
      })),
      getSummary: jasmine.createSpy('getSummary').and.returnValue(of({
        cefrLevel: 'B2',
        cefrLabel: { en: 'B2 Upper-Intermediate', ar: 'B2 فوق المتوسط' },
        weeklyGoalHours: { done: 3, target: 5 },
        vocabularyWords: 450,
        quizAccuracy: 88,
        syllabus: { completed: 14, total: 28 },
        studyHours: 12.5,
        studyHoursDelta: 2.1,
        streakDays: 5,
        bestStreakDays: 12,
        quizzesCompleted: 10,
        weeklyActivity: [
          { day: 'sat', minutes: 30 },
          { day: 'sun', minutes: 45 },
          { day: 'mon', minutes: 20 },
        ],
        weeklyFocus: { en: 'Focus on tenses', ar: 'التركيز على الأزمنة' },
        skills: [],
        recommendation: { en: 'Great progress!', ar: 'تقدم رائع!' },
      })),
      getLeaderboard: jasmine.createSpy('getLeaderboard').and.returnValue(of([
        { rank: 1, name: { en: 'Omar', ar: 'عمر' }, city: { en: 'Cairo', ar: 'القاهرة' }, xp: 1200, isCurrentUser: false },
        { rank: 2, name: { en: 'Adel', ar: 'عادل' }, city: { en: 'Cairo', ar: 'القاهرة' }, xp: 1000, isCurrentUser: true },
      ])),
      getAchievements: jasmine.createSpy('getAchievements').and.returnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [ProgressPage],
      providers: [
        provideRouter([]),
        LanguageService,
        { provide: ProgressService, useValue: progressServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProgressPage);
    component = fixture.componentInstance;
  });

  it('should create ProgressPage', () => {
    expect(component).toBeTruthy();
  });

  it('should compute syllabus percentage and average minutes correctly', () => {
    fixture.detectChanges();
    expect((component as any).syllabusPercent()).toBe(50);
    expect((component as any).averageMinutes()).toBe(32);
    expect((component as any).peakDay()).toBe('sun');
  });

  it('should identify rival for XP nudge', () => {
    fixture.detectChanges();
    const rival = (component as any).rival();
    expect(rival).toBeTruthy();
    expect(rival.gap).toBe(200);
  });
});
