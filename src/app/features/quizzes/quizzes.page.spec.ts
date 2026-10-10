import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { QuizzesPage } from './quizzes.page';
import { QuizService } from '../../core/data/quiz.service';
import { QUIZ_MODULES_MOCK, QUIZ_QUESTIONS_MOCK } from '../../core/mock/quizzes.mock';

describe('QuizzesPage', () => {
  let component: QuizzesPage;
  let fixture: ComponentFixture<QuizzesPage>;
  let quizServiceMock: any;

  beforeEach(async () => {
    quizServiceMock = {
      getModules: jasmine.createSpy('getModules').and.returnValue(of(QUIZ_MODULES_MOCK)),
      getQuestions: jasmine.createSpy('getQuestions').and.returnValue(of(QUIZ_QUESTIONS_MOCK['past'])),
      grade: jasmine.createSpy('grade').and.returnValue({
        moduleTitle: QUIZ_MODULES_MOCK[0].title,
        correct: 2,
        total: 2,
        percent: 100,
        elapsedSec: 30,
        xpEarned: 70,
        review: [],
      }),
    };

    await TestBed.configureTestingModule({
      imports: [QuizzesPage],
      providers: [
        provideRouter([]),
        { provide: QuizService, useValue: quizServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QuizzesPage);
    component = fixture.componentInstance;
  });

  it('should create QuizzesPage', () => {
    expect(component).toBeTruthy();
  });

  it('should filter modules by category', () => {
    fixture.detectChanges();
    (component as any).category.set('grammar');

    const visible = (component as any).visibleModules();
    expect(visible.every((m: any) => m.categories.includes('grammar'))).toBeTrue();
  });

  it('should submit quiz attempt and receive result', () => {
    fixture.detectChanges();
    (component as any).onSubmit({ answers: [0, 1], elapsedSec: 30 });

    expect(quizServiceMock.grade).toHaveBeenCalled();
    expect((component as any).result()).toBeTruthy();
  });

  it('should reset result on retry', () => {
    fixture.detectChanges();
    (component as any).onSubmit({ answers: [0, 1], elapsedSec: 30 });
    (component as any).retry();

    expect((component as any).result()).toBeNull();
  });
});
