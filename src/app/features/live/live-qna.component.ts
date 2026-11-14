import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/data/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { LiveQuestion, LiveQuestionStatus } from '../../core/models/sprint3';
import { LiveQnaService, QNA_HOUSE_RULES } from '../../core/services/live-qna.service';

@Component({
  selector: 'app-live-qna',
  imports: [FormsModule, LucideAngularModule, TranslatePipe, DatePipe],
  template: `
    <div class="card flex h-full flex-col overflow-hidden bg-surface shadow-card">
      <!-- Header -->
      <header class="flex items-center justify-between border-b border-line px-4 py-3">
        <div class="flex items-center gap-2">
          <lucide-icon name="messages-square" [size]="18" class="text-primary" />
          <h2 class="font-display text-sm font-bold text-ink">{{ 'qna.tabTitle' | t }}</h2>
          <span class="rounded-full bg-primary/10 px-2 py-0.5 font-display text-[0.6875rem] font-semibold text-primary">
            {{ filteredQuestions().length }}
          </span>
        </div>
        <button
          type="button"
          (click)="showRules.set(!showRules())"
          class="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <lucide-icon name="help-circle" [size]="14" />
          {{ 'qna.houseRulesTitle' | t }}
        </button>
      </header>

      <!-- House Rules Banner (collapsible) -->
      @if (showRules()) {
        <div class="border-b border-line bg-surface-warm/60 p-3 text-xs leading-relaxed text-ink-body">
          <div class="flex items-center justify-between font-display font-bold text-ink">
            <span class="flex items-center gap-1.5"><lucide-icon name="shield-check" [size]="14" class="text-primary" /> {{ 'qna.houseRulesTitle' | t }}</span>
            <button type="button" (click)="showRules.set(false)" class="text-ink-muted hover:text-ink"><lucide-icon name="x" [size]="14" /></button>
          </div>
          <ul class="mt-2 list-inside list-disc space-y-1 text-ink-muted">
            @for (rule of houseRules(); track rule) {
              <li>{{ rule }}</li>
            }
          </ul>
        </div>
      }

      <!-- Moderator Status Filter (for teacher/assistant) -->
      @if (isStaff()) {
        <div class="flex items-center gap-1 border-b border-line bg-surface-tint3/50 px-3 py-1.5 text-xs">
          <button
            type="button"
            (click)="moderatorFilter.set('all')"
            class="rounded px-2 py-0.5 font-semibold transition"
            [class]="moderatorFilter() === 'all' ? 'bg-primary text-white' : 'text-ink-body hover:bg-black/5'"
          >All</button>
          <button
            type="button"
            (click)="moderatorFilter.set('pending')"
            class="rounded px-2 py-0.5 font-semibold transition"
            [class]="moderatorFilter() === 'pending' ? 'bg-amber-600 text-white' : 'text-ink-body hover:bg-black/5'"
          >Pending ({{ pendingCount() }})</button>
          <button
            type="button"
            (click)="moderatorFilter.set('approved')"
            class="rounded px-2 py-0.5 font-semibold transition"
            [class]="moderatorFilter() === 'approved' ? 'bg-emerald-600 text-white' : 'text-ink-body hover:bg-black/5'"
          >Approved</button>
          <button
            type="button"
            (click)="moderatorFilter.set('answered')"
            class="rounded px-2 py-0.5 font-semibold transition"
            [class]="moderatorFilter() === 'answered' ? 'bg-blue-600 text-white' : 'text-ink-body hover:bg-black/5'"
          >Answered</button>
        </div>
      }

      <!-- Questions Feed -->
      <div class="flex-1 space-y-3 overflow-y-auto p-3" role="feed" [attr.aria-label]="'qna.tabTitle' | t">
        @if (filteredQuestions().length === 0) {
          <div class="flex h-44 flex-col items-center justify-center gap-2 text-center text-ink-muted">
            <lucide-icon name="message-square-text" [size]="28" class="text-ink-muted/50" />
            <p class="text-xs">{{ (isStaff() ? 'qna.emptyTeacher' : 'qna.emptyStudent') | t }}</p>
          </div>
        } @else {
          @for (q of filteredQuestions(); track q.id) {
            <div class="rounded-card border border-line bg-white/70 p-3 shadow-xs dark:bg-surface-tint3/30">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-1.5">
                  <span class="font-display text-xs font-bold text-ink">{{ q.studentName }}</span>
                  <span class="text-[0.6875rem] text-ink-muted">· {{ q.createdAt | date: 'h:mm a' }}</span>
                </div>
                <!-- Status Badge -->
                @switch (q.status) {
                  @case ('pending') {
                    <span class="rounded bg-amber-500/15 px-1.5 py-0.5 text-[0.625rem] font-bold text-amber-700 dark:text-amber-300">
                      {{ 'qna.pendingBadge' | t }}
                    </span>
                  }
                  @case ('approved') {
                    <span class="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[0.625rem] font-bold text-emerald-700 dark:text-emerald-300">
                      {{ 'qna.approvedBadge' | t }}
                    </span>
                  }
                  @case ('answered') {
                    <span class="rounded bg-blue-500/15 px-1.5 py-0.5 text-[0.625rem] font-bold text-blue-700 dark:text-blue-300">
                      {{ 'qna.answeredBadge' | t }}
                    </span>
                  }
                  @case ('hidden') {
                    <span class="rounded bg-red-500/15 px-1.5 py-0.5 text-[0.625rem] font-bold text-red-700 dark:text-red-300">
                      Hidden
                    </span>
                  }
                }
              </div>

              <!-- Question text -->
              <p class="mt-1.5 text-xs leading-relaxed text-ink-body">{{ q.body }}</p>

              <!-- Moderation Controls (Staff only) -->
              @if (isStaff()) {
                <div class="mt-2.5 flex items-center justify-between border-t border-line/60 pt-2 text-[0.6875rem]">
                  <span class="text-ink-muted">
                    @if (q.moderatedBy) { {{ 'qna.moderatedBy' | t: { name: q.moderatedBy } }} }
                  </span>
                  <div class="flex items-center gap-1">
                    @if (q.status === 'pending' || q.status === 'hidden') {
                      <button
                        type="button"
                        (click)="moderate(q.id, 'approved')"
                        class="rounded bg-emerald-600/15 px-2 py-0.5 font-bold text-emerald-700 hover:bg-emerald-600/25 dark:text-emerald-300"
                      >{{ 'qna.moderateApprove' | t }}</button>
                    }
                    @if (q.status === 'approved') {
                      <button
                        type="button"
                        (click)="moderate(q.id, 'answered')"
                        class="rounded bg-blue-600/15 px-2 py-0.5 font-bold text-blue-700 hover:bg-blue-600/25 dark:text-blue-300"
                      >{{ 'qna.moderateAnswer' | t }}</button>
                    }
                    @if (q.status !== 'hidden') {
                      <button
                        type="button"
                        (click)="moderate(q.id, 'hidden')"
                        class="rounded bg-red-600/15 px-2 py-0.5 font-bold text-red-700 hover:bg-red-600/25 dark:text-red-300"
                      >{{ 'qna.moderateHide' | t }}</button>
                    }
                  </div>
                </div>
              }
            </div>
          }
        }
      </div>

      <!-- Question Input (Student or Teacher) -->
      <footer class="border-t border-line p-3 bg-surface-warm/40">
        @if (cooldownSeconds() > 0) {
          <div class="mb-2 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
            <lucide-icon name="timer" [size]="14" />
            <span>{{ 'qna.cooldownMsg' | t: { sec: cooldownSeconds() } }}</span>
          </div>
        }
        @if (errorMessage()) {
          <div class="mb-2 text-xs text-danger">{{ errorMessage() }}</div>
        }
        <form (ngSubmit)="sendQuestion()" class="flex items-center gap-2">
          <input
            type="text"
            [(ngModel)]="newQuestionText"
            name="question"
            [disabled]="cooldownSeconds() > 0 || isSubmitting()"
            [placeholder]="'qna.askPlaceholder' | t"
            class="input input-sm flex-1 text-xs"
            autocomplete="off"
            maxlength="250"
          />
          <button
            type="submit"
            class="btn btn-primary btn-sm px-3"
            [disabled]="!newQuestionText.trim() || cooldownSeconds() > 0 || isSubmitting()"
          >
            <lucide-icon name="send" [size]="14" />
          </button>
        </form>
      </footer>
    </div>
  `,
})
export class LiveQnaComponent implements OnInit {
  readonly sessionId = input<string>('live_grammar_1');

  protected readonly i18n = inject(LanguageService);
  protected readonly auth = inject(AuthService);
  protected readonly qna = inject(LiveQnaService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly showRules = signal<boolean>(false);
  protected readonly moderatorFilter = signal<'all' | 'pending' | 'approved' | 'answered'>('all');
  protected readonly cooldownSeconds = signal<number>(0);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isSubmitting = signal<boolean>(false);

  protected newQuestionText = '';
  private cooldownTimer: ReturnType<typeof setInterval> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.cooldownTimer !== null) {
        clearInterval(this.cooldownTimer);
        this.cooldownTimer = null;
      }
      if (this.pollTimer !== null) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    });
  }

  ngOnInit(): void {
    // Initial fetch
    this.refreshQuestions();

    // Bounded refresh polling every 10 seconds with DestroyRef lifecycle cleanup
    this.pollTimer = setInterval(() => {
      this.refreshQuestions();
    }, 10000);
  }

  protected readonly isStaff = computed(() => {
    const role = this.auth.user()?.role;
    return role === 'admin' || role === 'assistant';
  });

  protected readonly houseRules = computed(() => {
    return this.i18n.lang() === 'ar' ? QNA_HOUSE_RULES.ar : QNA_HOUSE_RULES.en;
  });

  // Questions signal from service with automatic DestroyRef teardown
  protected readonly questions = toSignal(this.qna.questions$, { initialValue: [] });

  /**
   * Filtered questions feed:
   * - Staff: sees all questions according to moderation filter.
   * - Students: only see approved or answered questions (AG-124: pending questions hidden from non-staff, including author).
   */
  protected readonly filteredQuestions = computed(() => {
    const sId = this.sessionId();
    const all = this.questions().filter((q) => !sId || q.liveSessionId === sId);

    if (this.isStaff()) {
      const f = this.moderatorFilter();
      if (f === 'all') return all;
      return all.filter((q) => q.status === f);
    }

    // Student view: approved/answered only (AG-124 pending questions visible ONLY to staff)
    return all.filter((q) => q.status === 'approved' || q.status === 'answered');
  });

  protected readonly pendingCount = computed(() => {
    return this.questions().filter((q) => q.status === 'pending').length;
  });

  protected async sendQuestion(): Promise<void> {
    const raw = this.newQuestionText.trim();
    if (!raw) return;

    const user = this.auth.user();
    // Reject guest users or unauthenticated callers
    if (!user?.id) {
      this.errorMessage.set(
        this.i18n.lang() === 'ar'
          ? 'يجب تسجيل الدخول كطالب لطرح سؤال.'
          : 'You must be logged in as a student to ask a question.'
      );
      return;
    }

    if (this.cooldownSeconds() > 0 || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    try {
      const studentId = user.id;
      const studentName = user.fullName || 'Student ' + studentId.slice(0, 4);

      const res = await this.qna.submitQuestionAsync(this.sessionId(), studentId, studentName, raw);
      if (!res.success) {
        this.errorMessage.set(res.error || 'Failed to submit question.');
        if (res.secondsRemaining) {
          this.startCooldown(res.secondsRemaining);
        }
      } else {
        this.newQuestionText = '';
        this.errorMessage.set(null);
        this.startCooldown(15);
        await this.refreshQuestions();
      }
    } catch (err: any) {
      this.errorMessage.set(err?.message || 'Error submitting question.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected async moderate(questionId: string, status: LiveQuestionStatus): Promise<void> {
    if (!this.isStaff()) return;

    const staffName = this.auth.user()?.fullName || 'Staff Assistant';
    try {
      await this.qna.updateQuestionStatusAsync(questionId, status, staffName);
      await this.refreshQuestions();
    } catch (err: any) {
      this.errorMessage.set(err?.message || 'Error updating question status.');
    }
  }

  private async refreshQuestions(): Promise<void> {
    try {
      await this.qna.refresh(this.sessionId());
    } catch (error: any) {
      this.errorMessage.set(error?.message || 'Unable to refresh questions.');
    }
  }

  private startCooldown(sec: number): void {
    if (this.cooldownTimer !== null) {
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = null;
    }
    this.cooldownSeconds.set(sec);
    this.cooldownTimer = setInterval(() => {
      const current = this.cooldownSeconds();
      if (current <= 1) {
        this.cooldownSeconds.set(0);
        if (this.cooldownTimer !== null) {
          clearInterval(this.cooldownTimer);
          this.cooldownTimer = null;
        }
      } else {
        this.cooldownSeconds.set(current - 1);
      }
    }, 1000);
  }
}
