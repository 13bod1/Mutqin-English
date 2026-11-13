import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { LanguageService } from '../../core/i18n/language.service';
import { LocalizePipe, TranslatePipe } from '../../core/i18n/translate.pipe';
import { GuardianReportService } from '../../core/services/guardian-report.service';
import { StatePanelComponent } from '../../shared/ui/state-panel.component';

@Component({
  selector: 'app-guardian-report',
  imports: [
    RouterLink,
    LucideAngularModule,
    TranslatePipe,
    LocalizePipe,
    DatePipe,
    DecimalPipe,
    StatePanelComponent,
  ],
  template: `
    <div class="min-h-screen bg-surface-page py-8 px-4 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-3xl">
        <!-- Brand Header & Language Switcher -->
        <header class="flex items-center justify-between border-b border-line pb-4">
          <div class="flex items-center gap-3">
            <span class="grid h-12 w-12 place-items-center rounded-xl bg-primary text-white font-display text-xl font-extrabold shadow-sm">
              AM
            </span>
            <div>
              <h1 class="font-display text-lg font-bold text-ink sm:text-xl">{{ 'brand.name' | t }}</h1>
              <p class="text-xs text-ink-muted">{{ 'guardian.subtitle' | t }}</p>
            </div>
          </div>
          <button
            type="button"
            (click)="i18n.toggle()"
            class="rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink-body hover:bg-surface-warm"
          >
            {{ i18n.lang() === 'ar' ? 'English' : 'عربي' }}
          </button>
        </header>

        <!-- Main Content -->
        <main class="mt-6">
          @switch (reportStatus().status) {
            @case ('disabled') {
              <app-state-panel
                icon="shield-ban"
                [title]="'guardian.disabledTitle' | t"
                [text]="reportStatus().errorMessage ? (reportStatus().errorMessage![i18n.lang()]) : ('guardian.disabledText' | t)"
              >
                <a actions routerLink="/" class="btn btn-primary">{{ 'notFound.back' | t }}</a>
              </app-state-panel>
            }

            @case ('expired') {
              <app-state-panel
                icon="clock"
                [title]="'guardian.expiredTitle' | t"
                [text]="reportStatus().errorMessage ? (reportStatus().errorMessage![i18n.lang()]) : ('guardian.expiredText' | t)"
              >
                <a actions routerLink="/" class="btn btn-primary">{{ 'notFound.back' | t }}</a>
              </app-state-panel>
            }

            @case ('not_found') {
              <app-state-panel
                icon="circle-alert"
                title="Report Not Found"
                text="The report link provided is invalid or has expired."
              >
                <a actions routerLink="/" class="btn btn-primary">{{ 'notFound.back' | t }}</a>
              </app-state-panel>
            }

            @case ('ok') {
              @if (reportStatus().report; as rep) {
                @let d = rep.data;
                <div class="space-y-6">
                  <!-- Student Card -->
                  <div class="card p-6 border-s-4 border-s-primary bg-gradient-to-r from-surface to-surface-warm/30 shadow-card">
                    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <span class="rounded bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                          {{ 'stagesShort.' + d.stage | t }} · Week of {{ d.weekStart | date: 'd MMMM y' }}
                        </span>
                        <h2 class="mt-2 font-display text-2xl font-extrabold text-ink">{{ d.studentName }}</h2>
                        <p class="text-xs text-ink-muted">Private Parent Portal · Secure Token Verification</p>
                      </div>
                      <div class="rounded-card border border-line bg-surface p-3 text-center sm:min-w-[130px]">
                        <p class="font-display text-2xl font-black text-primary">{{ d.totalPoints }}</p>
                        <p class="text-[0.6875rem] font-bold text-ink-muted uppercase tracking-wider">{{ 'guardian.pointsEarned' | t }}</p>
                      </div>
                    </div>
                  </div>

                  <!-- Metrics Grid -->
                  <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <!-- Attendance -->
                    <div class="card p-5 border border-line">
                      <div class="flex items-center justify-between">
                        <span class="text-xs font-semibold text-ink-muted">{{ 'guardian.attendance' | t }}</span>
                        <span class="icon-tile h-9 w-9 tone-brand"><lucide-icon name="calendar-check" [size]="16" /></span>
                      </div>
                      <p class="mt-3 font-display text-3xl font-extrabold text-ink">{{ d.attendanceRate }}%</p>
                      <p class="mt-1 text-xs text-ink-body">{{ 'guardian.attendanceCount' | t: { attended: d.attendedSessions, total: d.totalSessions } }}</p>
                    </div>

                    <!-- Quiz Average -->
                    <div class="card p-5 border border-line">
                      <div class="flex items-center justify-between">
                        <span class="text-xs font-semibold text-ink-muted">{{ 'guardian.quizAverage' | t }}</span>
                        <span class="icon-tile h-9 w-9 tone-success"><lucide-icon name="list-checks" [size]="16" /></span>
                      </div>
                      <p class="mt-3 font-display text-3xl font-extrabold text-ink">{{ d.quizAverage }}%</p>
                      <p class="mt-1 text-xs text-ink-body">{{ d.quizzes.length }} interactive quizzes completed</p>
                    </div>

                    <!-- Lectures Done -->
                    <div class="card p-5 border border-line">
                      <div class="flex items-center justify-between">
                        <span class="text-xs font-semibold text-ink-muted">{{ 'guardian.lecturesDone' | t }}</span>
                        <span class="icon-tile h-9 w-9 tone-gold"><lucide-icon name="book-open" [size]="16" /></span>
                      </div>
                      <p class="mt-3 font-display text-3xl font-extrabold text-ink">{{ d.lecturesCompleted }}</p>
                      <p class="mt-1 text-xs text-ink-body">+{{ d.pointsEarned }} XP earned this week</p>
                    </div>
                  </div>

                  <!-- Quizzes List -->
                  <div class="card p-6 border border-line">
                    <h3 class="flex items-center gap-2 font-display text-base font-bold text-ink">
                      <lucide-icon name="award" [size]="18" class="text-primary" />
                      Weekly Diagnostic Assessments
                    </h3>
                    <div class="mt-4 divide-y divide-line/60">
                      @for (q of d.quizzes; track q.title.en) {
                        <div class="flex items-center justify-between py-3">
                          <div>
                            <p class="font-display text-sm font-semibold text-ink">{{ q.title | loc }}</p>
                            <p class="text-[0.6875rem] text-ink-muted">{{ q.date | date: 'EEEE, d MMM y' }}</p>
                          </div>
                          <div class="text-end">
                            <span class="font-display text-base font-bold" [class]="(q.score / q.maxScore) >= 0.8 ? 'text-success' : 'text-ink'">
                              {{ q.score }} / {{ q.maxScore }}
                            </span>
                            <span class="block text-[0.6875rem] text-ink-muted">({{ ((q.score / q.maxScore) * 100) | number: '1.0-0' }}%)</span>
                          </div>
                        </div>
                      }
                    </div>
                  </div>

                  <!-- Missed Deadlines -->
                  <div class="card p-6 border border-line">
                    <h3 class="flex items-center gap-2 font-display text-base font-bold text-ink">
                      <lucide-icon name="clock" [size]="18" class="text-amber-600" />
                      {{ 'guardian.missedDeadlines' | t }}
                    </h3>
                    <div class="mt-3">
                      @if (d.missedDeadlines.length === 0) {
                        <div class="flex items-center gap-2 text-sm text-success font-medium">
                          <lucide-icon name="circle-check" [size]="18" />
                          <span>{{ 'guardian.noMissedDeadlines' | t }}</span>
                        </div>
                      } @else {
                        <ul class="space-y-1.5 text-sm text-danger font-medium list-disc list-inside">
                          @for (m of d.missedDeadlines; track m) {
                            <li>{{ m }}</li>
                          }
                        </ul>
                      }
                    </div>
                  </div>

                  <!-- Teacher Observations & Notes -->
                  <div class="card p-6 border-l-4 border-l-gold bg-surface-warm/40 shadow-card">
                    <div class="flex items-center gap-2 font-display text-sm font-bold text-ink">
                      <lucide-icon name="message-square" [size]="18" class="text-gold" />
                      <span>{{ 'guardian.teacherNotesTitle' | t }}</span>
                    </div>
                    <blockquote class="mt-3 text-sm leading-relaxed text-ink-body italic">
                      "{{ d.teacherNotes | loc }}"
                    </blockquote>
                    <p class="mt-3 text-xs font-bold text-ink-muted text-end">
                      — Mr. Adel Mostafa (English Department Lead)
                    </p>
                  </div>

                  <!-- Privacy & 7-day expiration disclaimer footer -->
                  <footer class="text-center text-xs text-ink-muted pt-4 border-t border-line">
                    <p>Protected by cryptographic link token. This private report automatically expires 7 days after issue date.</p>
                    <p class="mt-1">© 2026 Mr. Adel Mostafa Educational Platform. All rights reserved.</p>
                  </footer>
                </div>
              }
            }
          }
        </main>
      </div>
    </div>
  `,
})
export class GuardianReportPage {
  readonly token = input<string>('');

  protected readonly i18n = inject(LanguageService);
  private readonly guardianService = inject(GuardianReportService);

  protected readonly reportStatus = computed(() => {
    const t = this.token();
    // Default to sample valid report if no token provided in URL
    const searchToken = t || 'tok_nour_saeed_7d_valid_hash_98a72b1';
    return this.guardianService.getReportByToken(searchToken);
  });
}
