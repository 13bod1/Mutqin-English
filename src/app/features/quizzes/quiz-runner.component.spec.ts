import { ComponentFixture, TestBed } from '@angular/core';
import { QuizRunnerComponent } from './quiz-runner.component';
import { QUIZ_MODULES_MOCK, QUIZ_QUESTIONS_MOCK } from '../../core/mock/quizzes.mock';

describe('QuizRunnerComponent', () => {
  let component: QuizRunnerComponent;
  let fixture: ComponentFixture<QuizRunnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizRunnerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(QuizRunnerComponent);
    component = fixture.componentInstance;
  });

  it('should render question prompt and options', () => {
    fixture.componentRef.setInput('module', QUIZ_MODULES_MOCK[0]);
    fixture.componentRef.setInput('questions', QUIZ_QUESTIONS_MOCK['past']);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('button[role="radio"]').length).toBeGreaterThan(0);
  });

  it('should select option when option button is clicked', () => {
    fixture.componentRef.setInput('module', QUIZ_MODULES_MOCK[0]);
    fixture.componentRef.setInput('questions', QUIZ_QUESTIONS_MOCK['past']);
    fixture.detectChanges();

    (component as any).select(1);

    expect((component as any).answers()[0]).toBe(1);
  });

  it('should show unanswered alert on submit if questions remain unanswered', () => {
    fixture.componentRef.setInput('module', QUIZ_MODULES_MOCK[0]);
    fixture.componentRef.setInput('questions', QUIZ_QUESTIONS_MOCK['past']);
    fixture.detectChanges();

    (component as any).submit();

    expect((component as any).showUnanswered()).toBeTrue();
  });

  it('should emit submitted when all questions are answered', () => {
    fixture.componentRef.setInput('module', QUIZ_MODULES_MOCK[0]);
    fixture.componentRef.setInput('questions', QUIZ_QUESTIONS_MOCK['past']);
    fixture.detectChanges();

    const qs = QUIZ_QUESTIONS_MOCK['past'];
    qs.forEach((_, idx) => {
      (component as any).index.set(idx);
      (component as any).select(0);
    });

    let emitted: any = null;
    component.submitted.subscribe((res) => (emitted = res));

    (component as any).submit();

    expect(emitted).toBeTruthy();
    expect(emitted.answers.length).toBe(qs.length);
  });
});
