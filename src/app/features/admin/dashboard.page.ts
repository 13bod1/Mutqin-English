import { DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AdminService } from '../../core/data/admin.service';
import { LanguageService } from '../../core/i18n/language.service';
import { LocalizePipe, TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminHeaderComponent, InitialsComponent, StatComponent } from './admin-ui';

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, LucideAngularModule, TranslatePipe, LocalizePipe, DecimalPipe, AdminHeaderComponent, StatComponent, InitialsComponent],
  template: `
    <div class="space-y-6">
      <app-admin-header [title]="'admin.dash.greeting' | t" [subtitle]="'admin.dash.subtitle' | t">
        <a routerLink="/admin/announcements" class="btn btn-soft"><lucide-icon name="megaphone" [size]="16" />{{ 'admin.dash.newAnnouncement' | t }}</a>
        <a routerLink="/admin/lectures" class="btn btn-primary"><lucide-icon name="plus" [size]="16" />{{ 'admin.dash.newLecture' | t }}</a>
      </app-admin-header>

      @if (next(); as n) {
        <div class="banner-gradient flex flex-col gap-5 rounded-banner p-6 text-white shadow-lift md:flex-row md:items-center md:p-7">
          <div class="flex-1">
            <span class="chip"><lucide-icon name="radio" [size]="13" class="me-1.5" />{{ 'admin.dash.nextLive' | t }}</span>
            <p class="mt-3 font-display text-xl font-bold md:text-2xl">{{ n.title | loc }}</p>
            <p class="mt-1.5 text-sm text-white/80">{{ 'admin.dash.nextMeta' | t: { seats: n.seatsTaken, max: n.maxSeats, pending: admin.pendingCount() } }}</p>
          </div>
          <div class="flex flex-wrap gap-3">
            <a [routerLink]="['/live', n.id, 'studio']" class="btn btn-light"><lucide-icon name="video" [size]="16" />{{ 'admin.dash.openStudio' | t }}</a>
            <a routerLink="/admin/payments" class="btn btn-outline-light"><lucide-icon name="receipt" [size]="16" />{{ 'admin.dash.reviewReceipts' | t }}</a>
          </div>
        </div>
      }

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <app-stat [label]="'admin.stats.students' | t" [value]="tot.students + ''" icon="users" [note]="'admin.stats.seatsLeft' | t: { n: tot.maxSeats - tot.students }" />
        <app-stat [label]="'admin.stats.revenueOct' | t" [value]="'access.price' | t: { n: (tot.revenueOct | number) ?? '' }" icon="banknote"
          [note]="'admin.stats.vsLast' | t: { n: '+14%' }" noteIcon="trending-up" noteClass="text-success" />
        <app-stat [label]="'admin.stats.viewsOct' | t" [value]="(tot.viewsOct | number) ?? ''" icon="monitor-play" [note]="'admin.stats.avgWatch' | t: { n: 27 }" />
        <app-stat [label]="'admin.stats.avgQuiz' | t" [value]="tot.avgQuiz + '%'" icon="list-checks" [note]="'admin.stats.attempts' | t: { n: (tot.quizAttempts | number) ?? '' }" />
      </div>

      <div class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div class="space-y-6">
          <section class="card p-5 sm:p-6">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="font-display text-base font-bold">{{ 'admin.dash.enrollments' | t }}</h2>
                <p class="text-[0.8125rem] text-ink-muted">{{ 'admin.dash.last12' | t }}</p>
              </div>
              <span class="tag tone-success">{{ 'admin.dash.thisWeek' | t: { n: last() } }}</span>
            </div>
            <div class="mt-6 flex h-40 items-end gap-2 sm:gap-3" role="img" [attr.aria-label]="'admin.dash.enrollments' | t">
              @for (v of admin.enrollments; track $index; let last = $last) {
                <div class="group relative flex-1 rounded-t-md transition" [class]="last ? 'bg-primary' : 'bg-primary-light/50 hover:bg-primary-light'" [style.height.%]="(v / max()) * 100">
                  <span class="pointer-events-none absolute -top-6 start-1/2 -translate-x-1/2 rounded bg-ink px-1.5 py-0.5 text-[0.625rem] font-bold text-white opacity-0 group-hover:opacity-100">{{ v }}</span>
                </div>
              }
            </div>
            <div class="mt-2 flex justify-between text-xs text-ink-muted"><span>{{ 'admin.months.aug' | t }}</span><span>{{ 'admin.months.sep' | t }}</span><span>{{ 'admin.months.oct' | t }}</span></div>
          </section>

          <section class="card p-5 sm:p-6">
            <h2 class="font-display text-base font-bold">{{ 'admin.dash.activity' | t }}</h2>
            <ul class="mt-4 space-y-4">
              @for (a of activity(); track $index) {
                <li class="flex items-center gap-3">
                  <app-initials [text]="a.who" size="sm" />
                  <span class="flex-1 text-[0.8125rem] text-ink-body">
                    {{ a.isReal ? a.text : (a.text | t) }}
                  </span>
                  <span class="shrink-0 text-xs" [class]="a.isReal ? 'font-bold text-primary' : 'text-ink-muted'">
                    {{ a.isReal ? a.when : (a.when | t) }}
                  </span>
                </li>
              }
            </ul>
          </section>
        </div>

        <section class="card h-fit p-5 sm:p-6">
          <h2 class="font-display text-base font-bold">{{ 'admin.dash.attention' | t }}</h2>
          <div class="mt-4 space-y-3">
            @for (a of attention(); track a.title) {
              <a [routerLink]="a.link" class="flex items-center gap-3 rounded-card border border-line/60 p-3 transition hover:border-primary/40 hover:bg-surface-warm">
                <span class="icon-tile h-9 w-9" [class]="a.tone"><lucide-icon [name]="a.icon" [size]="17" /></span>
                <span class="flex-1">
                  <span class="block font-display text-sm font-semibold text-ink">{{ a.title | t: a.params }}</span>
                  <span class="block text-xs text-ink-muted">{{ a.sub | t }}</span>
                </span>
                <lucide-icon name="chevron-right" [size]="16" class="flip-rtl text-ink-muted" />
              </a>
            }
          </div>
        </section>
      </div>
    </div>
  `,
})
export class AdminDashboardPage {
  protected readonly admin = inject(AdminService);
  protected readonly i18n = inject(LanguageService);
  protected readonly tot = this.admin.totals;

  protected readonly next = computed(() => this.admin.liveClasses().filter((s) => s.status === 'scheduled').sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]);
  protected readonly max = computed(() => Math.max(...this.admin.enrollments));
  protected readonly last = computed(() => this.admin.enrollments[this.admin.enrollments.length - 1]);

  protected readonly attention = computed(() => {
    const processingCount = this.admin.lectures().filter((l) => l.state === 'processing').length;
    const questionsCount = this.admin.assistants().reduce((sum, a) => sum + (a.questions || 0), 0);
    const suspendedCount = this.admin.students().filter((s) => s.status === 'suspended').length;

    return [
      { icon: 'receipt', tone: 'tone-warning', title: 'admin.dash.att.receipts', params: { n: this.admin.pendingCount() }, sub: 'admin.dash.att.receiptsSub', link: '/admin/payments' },
      { icon: 'message-square', tone: '', title: 'admin.dash.att.questions', params: { n: questionsCount }, sub: 'admin.dash.att.questionsSub', link: '/admin/metrics' },
      { icon: 'monitor-play', tone: 'tone-gold', title: 'admin.dash.att.processing', params: { n: processingCount }, sub: 'admin.dash.att.processingSub', link: '/admin/lectures' },
      { icon: 'user-x', tone: 'tone-danger', title: 'admin.dash.att.suspended', params: { n: suspendedCount }, sub: 'admin.dash.att.suspendedSub', link: '/admin/users' },
    ];
  });

  protected readonly activity = computed(() => {
    const realLogins = this.admin.recentLogins();
    const items: { who: string; text: string; when: string; isReal?: boolean }[] = [];

    for (const l of realLogins.slice(0, 4)) {
      const isArabic = this.i18n.lang() === 'ar';
      const actionText = l.type === 'signup'
        ? (isArabic ? `طالب جديد سجّل في الأكاديمية (${l.name})` : `New student registered (${l.name})`)
        : (isArabic ? `قام ${l.name} بتسجيل الدخول إلى حسابه` : `${l.name} logged into student dashboard`);

      const minutesAgo = Math.max(1, Math.round((Date.now() - new Date(l.time).getTime()) / 60000));
      const whenText = minutesAgo < 2
        ? (isArabic ? 'الآن' : 'Just now')
        : (isArabic ? `منذ ${minutesAgo} دقيقة` : `${minutesAgo}m ago`);

      items.push({
        who: l.who || 'ST',
        text: actionText,
        when: whenText,
        isReal: true,
      });
    }

    const baseDefaults = [
      { who: 'NS', text: 'admin.dash.act.a1', when: 'admin.dash.act.t1' },
      { who: 'MA', text: 'admin.dash.act.a2', when: 'admin.dash.act.t2' },
      { who: 'SH', text: 'admin.dash.act.a3', when: 'admin.dash.act.t3' },
      { who: 'YH', text: 'admin.dash.act.a4', when: 'admin.dash.act.t4' },
    ];

    for (const b of baseDefaults) {
      if (items.length < 6) items.push(b);
    }
    return items;
  });
}
