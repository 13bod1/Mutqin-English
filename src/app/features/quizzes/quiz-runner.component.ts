import { Component, computed, effect, input, output, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { LocalizePipe, TranslatePipe } from '../../core/i18n/translate.pipe';
import { QuizModule, QuizQuestion } from '../../core/models/quiz';

export interface QuizSubmission {
  answers: (number | null)[];
  elapsedSec: number;
}

/** One-question-at-a-time practice view. Emits the answers on submit. */
@Component({
  selector: 'app-quiz-runner',
  imports: [LucideAngularModule, TranslatePipe, LocalizePipe],
  host: { class: 'block' },
  template: `
    <div class="card mx-auto max-w-3xl p-5 shadow-lift sm:p-8">
      <div class="flex items-center justify-between gap-3">
        <p class="font-display text-sm font-semibold text-ink">{{ module().title | loc }}</p>
        <p class="shrink-0 font-display text-xs font-semibold text-ink-muted" aria-live="polite">
          {{ 'quizzes.practice.counter' | t: { n: index() + 1, total: questions().length } }}
        </p>
      </div>
      <div class="progress-track mt-3"><div class="progress-fill" [style.width.%]="progress()"></div></div>

      @if (current(); as q) {
        <span class="pill mt-6"><lucide-icon name="book-open" [size]="13" />{{ q.topic | loc }}</span>
        <h3 class="mt-4 font-display text-lg font-semibold">{{ 'quizzes.practice.prompt' | t }}</h3>
        <p class="mt-3 rounded-card border border-line/70 bg-surface-warm px-4 py-4 text-base leading-7 text-ink sm:text-lg" dir="ltr" lang="en">
          {{ q.before }}<span class="mx-1 inline-block min-w-16 border-b-2 border-primary text-center font-semibold text-primary">{{ selectedText() }}</span>{{ q.after }}
        </p>

        <div class="mt-5 space-y-3" role="radiogroup" [attr.aria-label]="'quizzes.practice.prompt' | t">
          @for (opt of q.options; track $index) {
            <button type="button" role="radio" [attr.aria-checked]="answers()[index()] === $index" (click)="select($index)"
              class="flex w-full items-center gap-3 rounded-card border px-4 py-3.5 text-start transition"
              [class]="answers()[index()] === $index ? 'border-primary bg-surface-tint shadow-card' : 'border-line bg-white hover:border-primary/40'">
              <span class="grid h-5 w-5 shrink-0 place-items-center rounded-full border-[1.5px]"
                [class]="answers()[index()] === $index ? 'border-primary' : 'border-ink-muted'">
                @if (answers()[index()] === $index) { <span class="h-2.5 w-2.5 rounded-full bg-primary"></span> }
              </span>
              <span class="flex-1 font-display text-[0.9375rem] font-medium text-ink" dir="ltr" lang="en">
                <span class="me-1 text-ink-muted">{{ letters[$index] }})</span>{{ opt }}
              </span>
              @if (answers()[index()] === $index) {
                <span class="tag bg-primary text-white">{{ 'quizzes.practice.selected' | t }}</span>
              }
            </button>
          }
        </div>
      }

      @if (showUnanswered()) {
        <p class="field-error mt-5" role="alert">
          <lucide-icon name="circle-alert" [size]="14" />{{ 'quizzes.practice.unanswered' | t: { n: remaining() } }}
        </p>
      }

      <div class="mt-8 flex items-center justify-between gap-3 border-t border-line/70 pt-6">
        <button type="button" class="btn btn-soft" [disabled]="index() === 0" (click)="go(-1)">
          <lucide-icon name="arrow-right" [size]="15" class="rotate-180 rtl:rotate-0" />{{ 'quizzes.practice.previous' | t }}
        </button>
        <div class="flex gap-2">
          @if (index() < questions().length - 1) {
            <button type="button" class="btn btn-soft" (click)="go(1)">
              {{ 'quizzes.practice.next' | t }}<lucide-icon name="arrow-right" [size]="15" class="flip-rtl" />
            </button>
          }
          <button type="button" class="btn btn-primary" [class.hide-mobile]="index() < questions().length - 1" (click)="submit()">
            {{ 'quizzes.practice.submit' | t }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class QuizRunnerComponent {
  readonly module = input.required<QuizModule>();
  readonly questions = input.required<QuizQuestion[]>();
  readonly submitted = output<QuizSubmission>();

  protected readonly letters = ['A', 'B', 'C', 'D', 'E'];
  protected readonly index = signal(0);
  protected readonly answers = signal<(number | null)[]>([]);
  protected readonly showUnanswered = signal(false);
  private startedAt = Date.now();

  protected readonly current = computed(() => this.questions()[this.index()]);
  protected readonly remaining = computed(() => this.questions().length - this.answers().filter((a) => a !== null).length);
  protected readonly progress = computed(() => ((this.index() + 1) / Math.max(1, this.questions().length)) * 100);
  protected readonly selectedText = computed(() => {
    const a = this.answers()[this.index()];
    return a === null || a === undefined ? '______' : this.current()?.options[a];
  });

  constructor() {
    // Reset whenever a new question set is loaded.
    effect(() => {
      const qs = this.questions();
      this.answers.set(qs.map(() => null));
      this.index.set(0);
      this.showUnanswered.set(false);
      this.startedAt = Date.now();
    });
  }

  protected select(option: number): void {
    this.answers.update((a) => a.map((v, i) => (i === this.index() ? option : v)));
    if (this.remaining() === 0) this.showUnanswered.set(false);
  }

  protected go(step: number): void {
    this.index.update((i) => Math.min(this.questions().length - 1, Math.max(0, i + step)));
  }

  protected submit(): void {
    if (this.remaining() > 0) {
      this.showUnanswered.set(true);
      const firstEmpty = this.answers().findIndex((a) => a === null);
      if (firstEmpty >= 0) this.index.set(firstEmpty);
      return;
    }
    this.submitted.emit({ answers: this.answers(), elapsedSec: Math.round((Date.now() - this.startedAt) / 1000) });
  }
}
