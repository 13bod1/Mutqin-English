import { TestBed } from '@angular/core';
import { QuizService } from './quiz.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ProgressService } from './progress.service';
import { QUIZ_MODULES_MOCK, QUIZ_QUESTIONS_MOCK } from '../mock/quizzes.mock';
import { QuizModule, QuizQuestion } from '../models/quiz';

describe('QuizService', () => {
  let service: QuizService;
  let supabaseMock: any;
  let progressMock: any;

  beforeEach(() => {
    supabaseMock = {
      from: jasmine.createSpy('from').and.callFake(() => ({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: null, error: new Error('DB Error') }),
          }),
        }),
      })),
    };

    progressMock = {
      recordQuizResult: jasmine.createSpy('recordQuizResult').and.returnValue(Promise.resolve(60)),
    };

    TestBed.configureTestingModule({
      providers: [
        QuizService,
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: ProgressService, useValue: progressMock },
      ],
    });

    service = TestBed.inject(QuizService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return modules mock on error', (done) => {
    service.getModules().subscribe({
      next: (modules) => {
        expect(modules).toEqual(QUIZ_MODULES_MOCK);
        done();
      },
    });
  });

  it('should return questions mock on error', (done) => {
    const moduleId = QUIZ_MODULES_MOCK[0].id;
    service.getQuestions(moduleId).subscribe({
      next: (questions) => {
        expect(questions).toEqual(QUIZ_QUESTIONS_MOCK[moduleId] ?? []);
        done();
      },
    });
  });

  it('should grade a quiz attempt accurately', () => {
    const module: QuizModule = QUIZ_MODULES_MOCK[0];
    const questions: QuizQuestion[] = [
      {
        id: 'q1',
        topic: { en: 'Collocations', ar: 'المتلازمات' },
        before: 'She ',
        after: ' a mistake.',
        options: ['made', 'did', 'took', 'had'],
        correctIndex: 0,
        ruleTitle: { en: 'Make vs Do', ar: 'Make أم Do' },
        explanation: { en: 'Make a mistake', ar: 'Make a mistake' },
      },
      {
        id: 'q2',
        topic: { en: 'Collocations', ar: 'المتلازمات' },
        before: 'He ',
        after: ' research.',
        options: ['made', 'did', 'took', 'had'],
        correctIndex: 1,
        ruleTitle: { en: 'Make vs Do', ar: 'Make أم Do' },
        explanation: { en: 'Do research', ar: 'Do research' },
      },
    ];

    const answers = [0, 1]; // Both correct -> 100%
    const elapsedSec = 45;

    const result = service.grade(module, questions, answers, elapsedSec);

    expect(result.correct).toBe(2);
    expect(result.total).toBe(2);
    expect(result.percent).toBe(100);
    expect(result.elapsedSec).toBe(45);
    expect(result.xpEarned).toBe(20 + 50); // 2*10 + 50 bonus
    expect(progressMock.recordQuizResult).toHaveBeenCalledWith(module.id, 2, 2, 100);
  });
});
