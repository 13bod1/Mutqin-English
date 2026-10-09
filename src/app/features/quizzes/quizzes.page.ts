import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { QuizService } from '../../core/data/quiz.service';
import { LocalizePipe, TranslatePipe } from '../../core/i18n/translate.pipe';
import { QuizCategory, QuizModule, QuizQuestion, QuizResult } from '../../core/models/quiz';
import { CtaBannerComponent } from '../../shared/ui/cta-banner.component';
import { SectionHeaderComponent } from '../../shared/ui/section-header.component';
import { QuizResultsComponent } from './quiz-results.component';
import { QuizRunnerComponent, QuizSubmission } from './quiz-runner.component';

type CategoryFilter = 'all' | QuizCategory;

@Component({
  selector: 'app-quizzes',
  imports: [
    RouterLink, LucideAngularModule, TranslatePipe, LocalizePipe,
    CtaBannerComponent, SectionHeaderComponent, QuizRunnerComponent, QuizResultsComponent,
  ],
  templateUrl: './quizzes.page.html',
})
export class QuizzesPage {
  private readonly quizService = inject(QuizService);
  private readonly practiceAnchor = viewChild<ElementRef<HTMLElement>>('practice');
  private readonly resultsAnchor = viewChild<ElementRef<HTMLElement>>('results');

  protected readonly modules = toSignal(this.quizService.getModules(), { initialValue: [] as QuizModule[] });
  protected readonly categories: CategoryFilter[] = ['all', 'grammar', 'vocabulary', 'phonetics', 'exam'];
  protected readonly category = signal<CategoryFilter>('all');

  protected readonly visibleModules = computed(() => {
    const c = this.category();
    return c === 'all' ? this.modules() : this.modules().filter((m) => m.categories.includes(c));
  });

  protected readonly activeModuleId = signal('past');
  protected readonly activeModule = computed(() => this.modules().find((m) => m.id === this.activeModuleId()));
  protected readonly questions = signal<QuizQuestion[]>([]);
  protected readonly result = signal<QuizResult | null>(null);

  protected readonly difficultyClass: Record<string, string> = {
    easy: 'bg-success-soft text-success',
    medium: 'bg-amber-soft text-amber',
    advanced: 'bg-danger-soft text-danger',
  };

  constructor() {
    this.load(this.activeModuleId(), false);
  }

  protected start(module: QuizModule): void {
    this.activeModuleId.set(module.id);
    this.load(module.id, true);
  }

  protected onSubmit(submission: QuizSubmission): void {
    const module = this.activeModule();
    if (!module) return;
    this.result.set(this.quizService.grade(module, this.questions(), submission.answers, submission.elapsedSec));
    setTimeout(() => this.resultsAnchor()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  protected retry(): void {
    this.load(this.activeModuleId(), true);
  }

  private load(id: string, scroll: boolean): void {
    this.result.set(null);
    this.quizService.getQuestions(id).subscribe((qs) => {
      this.questions.set(qs);
      if (scroll) this.practiceAnchor()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}
