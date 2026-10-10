import { ComponentFixture, TestBed } from '@angular/core';
import { QuizResultsComponent } from './quiz-results.component';
import { QuizResult } from '../../core/models/quiz';

describe('QuizResultsComponent', () => {
  let component: QuizResultsComponent;
  let fixture: ComponentFixture<QuizResultsComponent>;

  const mockResult: QuizResult = {
    moduleTitle: { en: 'Past Tenses', ar: 'الأزمنة الماضية' },
    correct: 4,
    total: 5,
    percent: 80,
    elapsedSec: 125,
    xpEarned: 65,
    review: [
      {
        question: {
          id: 'q1',
          topic: { en: 'Past Simple', ar: 'الماضي البسيط' },
          before: 'I ',
          after: ' a book.',
          options: ['read', 'reads', 'reading', 'have read'],
          correctIndex: 0,
          ruleTitle: { en: 'Past Tense', ar: 'زمن الماضي' },
          explanation: { en: 'Simple past action', ar: 'حدث ماضي بسيط' },
        },
        index: 0,
        selectedIndex: 0,
        correct: true,
      },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizResultsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(QuizResultsComponent);
    component = fixture.componentInstance;
  });

  it('should render score and elapsed time', () => {
    fixture.componentRef.setInput('result', mockResult);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('4/5');
    expect(compiled.textContent).toContain('80%');
    expect((component as any).elapsed()).toBe('02:05');
  });

  it('should emit retry output when retry button is clicked', () => {
    fixture.componentRef.setInput('result', mockResult);
    fixture.detectChanges();

    let retried = false;
    component.retry.subscribe(() => (retried = true));

    const btn = fixture.nativeElement.querySelector('button');
    btn.click();

    expect(retried).toBeTrue();
  });
});
