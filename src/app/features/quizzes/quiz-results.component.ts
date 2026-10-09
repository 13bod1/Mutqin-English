import { Component, computed, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { LocalizePipe, TranslatePipe } from '../../core/i18n/translate.pipe';
import { QuizResult } from '../../core/models/quiz';
import { ProgressRingComponent } from '../../shared/ui/progress-ring.component';

@Component({
  selector: 'app-quiz-results',
  imports: [LucideAngularModule, TranslatePipe, LocalizePipe, ProgressRingComponent],
  host: { class: 'block' },
  template: `
    <div class="card mx-auto max-w-4xl p-5 sm:p-8">
      <div class="flex flex-col gap-6 md:flex-row md:items-center">
        <app-progress-ring [percent]="result().percent" [size]="104" [stroke]="9" [color]="tone().ring">
          <span class="font-display text-2xl font-bold text-ink">{{ result().correct }}/{{ result().total }}</span>
          <span class="-mt-5 text-xs text-ink-muted">{{ result().percent }}%</span>
        </app-progress-ring>
        <div class="flex-1">
          <span class="tag" [class]="tone().pill">
            <lucide-icon [name]="tone().icon" [size]="12" />{{ tone().pillKey | t }}
          </span>
          <h3 class="mt-2 font-display text-xl font-bold">{{ tone().titleKey | t }}</h3>
          <p class="mt-1 text-sm text-ink-body">{{ tone().textKey | t }}</p>
        </div>
        <dl class="grid grid-cols-3 gap-2 md:w-[300px]">
          <div class="rounded-card bg-surface-tint2 p-3 text-center">
            <lucide-icon name="timer" [size]="16" class="text-ink-soft" />
            <dt class="mt-1 text-[0.6875rem] text-ink-muted">{{ 'quizzes.results.timeSpent' | t }}</dt>
            <dd class="font-display text-base font-bold tabular-nums text-ink">{{ elapsed() }}</dd>
          </div>
          <div class="rounded-card bg-success-soft p-3 text-center">
            <lucide-icon name="circle-check" [size]="16" class="text-success" />
            <dt class="mt-1 text-[0.6875rem] text-success">{{ 'quizzes.results.correct' | t }}</dt>
            <dd class="font-display text-base font-bold text-success">{{ result().correct }}</dd>
          </div>
          <div class="rounded-card bg-danger-soft p-3 text-center">
            <lucide-icon name="circle-x" [size]="16" class="text-danger" />
            <dt class="mt-1 text-[0.6875rem] text-danger">{{ 'quizzes.results.incorrect' | t }}</dt>
            <dd class="font-display text-base font-bold text-danger">{{ result().total - result().correct }}</dd>
          </div>
        </dl>
      </div>

      <div class="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-6">
        <h4 class="flex items-center gap-2 font-display text-base font-bold"><lucide-icon name="list-checks" [size]="18" />{{ 'quizzes.results.review' | t }}</h4>
        <span class="text-xs text-ink-muted">{{ 'quizzes.results.reviewHint' | t }}</span>
      </div>

      <ol class="mt-4 space-y-4">
        @for (r of result().review; track r.question.id) {
          <li class="rounded-card border p-4 sm:p-5" [class]="r.correct ? 'border-success/30 bg-success-soft/40' : 'border-danger-line bg-danger-soft/50'">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <p class="flex items-center gap-2 font-display text-sm font-bold text-ink">
                <span class="grid h-6 w-6 place-items-center rounded-full text-white" [class]="r.correct ? 'bg-success-mid' : 'bg-danger'">
                  <lucide-icon [name]="r.correct ? 'check' : 'x'" [size]="13" [strokeWidth]="3" />
                </span>
                {{ 'quizzes.results.questionN' | t: { n: r.index + 1 } }}: {{ r.question.ruleTitle | loc }}
              </p>
              <span class="tag" [class]="r.correct ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'">
                {{ (r.correct ? 'quizzes.results.correctTag' : 'quizzes.results.incorrectTag') | t }}
              </span>
            </div>
            <p class="mt-3 text-[0.9375rem] leading-7 text-ink" dir="ltr" lang="en">
              {{ r.question.before }}<strong class="text-success underline decoration-success/40 underline-offset-4">{{ r.question.options[r.question.correctIndex] }}</strong>{{ r.question.after }}
            </p>
            @if (!r.correct) {
              <p class="mt-1 text-sm text-danger">
                {{ 'quizzes.results.yourAnswer' | t }}
                <span class="font-semibold line-through" dir="ltr">{{ r.selectedIndex !== null ? r.question.options[r.selectedIndex] : ('quizzes.results.notAnswered' | t) }}</span>
              </p>
            }
            <div class="mt-3 rounded-card border-s-4 border-primary bg-white/80 p-3.5 text-sm leading-6 text-ink-body">
              <p class="mb-1 flex items-center gap-1.5 font-display text-xs font-bold text-ink"><lucide-icon name="sparkles" [size]="13" />{{ 'quizzes.results.insight' | t }}</p>
              {{ r.question.explanation | loc }}
              @if (r.question.arabicTip) {
                <p class="mt-2 border-t border-line/60 pt-2"><span class="font-semibold text-ink">{{ 'quizzes.results.arabicTrap' | t }}:</span> {{ r.question.arabicTip | loc }}</p>
              }
            </div>
          </li>
        }
      </ol>

      <div class="mt-6 text-center">
        <button type="button" class="btn btn-outline" (click)="retry.emit()"><lucide-icon name="rotate-ccw" [size]="15" />{{ 'quizzes.practice.retry' | t }}</button>
      </div>
    </div>
  `,
})
export class QuizResultsComponent {
  readonly result = input.required<QuizResult>();
  readonly retry = output<void>();

  protected readonly tone = computed(() => {
    const p = this.result().percent;
    if (p >= 80)
      return { ring: '#059669', pill: 'bg-success-soft text-success', icon: 'badge-check', pillKey: 'quizzes.results.mastery', titleKey: 'quizzes.results.excellent', textKey: 'quizzes.results.excellentText' };
    if (p >= 50)
      return { ring: '#D4AF37', pill: 'bg-gold-soft text-gold-dark', icon: 'target', pillKey: 'quizzes.results.keepGoing', titleKey: 'quizzes.results.good', textKey: 'quizzes.results.goodText' };
    return { ring: '#BA1A1A', pill: 'bg-danger-soft text-danger', icon: 'rotate-ccw', pillKey: 'quizzes.results.keepGoing', titleKey: 'quizzes.results.low', textKey: 'quizzes.results.lowText' };
  });

  protected readonly elapsed = computed(() => {
    const s = this.result().elapsedSec;
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  });
}
