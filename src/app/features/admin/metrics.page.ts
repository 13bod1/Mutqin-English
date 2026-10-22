import { Component, computed, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { AdminService } from '../../core/data/admin.service';
import { LocalizePipe, TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminHeaderComponent, InitialsComponent, StatComponent } from './admin-ui';

type Range = '7d' | '30d' | 'term';
const PRESENCE: Record<string, string> = { online: 'tone-success', away: 'tone-warning', offline: 'tone-neutral' };

/** Teaching-assistant performance: questions answered, receipts reviewed, response times. */
@Component({
  selector: 'app-admin-metrics',
  imports: [LucideAngularModule, TranslatePipe, LocalizePipe, AdminHeaderComponent, StatComponent, InitialsComponent],
  template: `
    <div class="space-y-6">
      <app-admin-header [title]="'admin.metrics.title' | t" [subtitle]="'admin.metrics.subtitle' | t">
        <div class="seg" role="tablist">
          @for (r of ranges; track r) {
            <button type="button" role="tab" [class.seg-on]="range() === r" [attr.aria-selected]="range() === r" (click)="range.set(r)">{{ 'admin.metrics.range.' + r | t }}</button>
          }
        </div>
        <button type="button" class="btn btn-primary"><lucide-icon name="plus" [size]="16" />{{ 'admin.metrics.add' | t }}</button>
      </app-admin-header>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <app-stat [label]="'admin.metrics.answered' | t" [value]="sum(admin.weeklyActivity.questions) + ''" icon="message-square" [note]="'admin.stats.vsLast' | t: { n: '+12%' }" noteIcon="trending-up" noteClass="text-success" />
        <app-stat [label]="'admin.metrics.reviewed' | t" [value]="sum(admin.weeklyActivity.receipts) + ''" icon="receipt" tone="tone-gold" [note]="'admin.metrics.waiting' | t: { n: admin.pendingCount() }" />
        <app-stat [label]="'admin.metrics.firstResponse' | t" [value]="'admin.metrics.minutes' | t: { n: 46 }" icon="timer" [note]="'admin.metrics.target' | t" noteIcon="circle-check" noteClass="text-success" />
        <app-stat [label]="'admin.metrics.rating' | t" value="4.8 / 5" icon="star" tone="tone-gold" [note]="'admin.metrics.ratings' | t: { n: 212 }" />
      </div>

      <div class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section class="card p-5 sm:p-6">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="font-display text-base font-bold">{{ 'admin.metrics.activity' | t }}</h2>
              <p class="text-[0.8125rem] text-ink-muted">{{ 'admin.metrics.week' | t }}</p>
            </div>
            <div class="flex gap-4 text-xs text-ink-body">
              <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-primary"></span>{{ 'admin.metrics.answered' | t }}</span>
              <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-gold"></span>{{ 'admin.metrics.reviewed' | t }}</span>
            </div>
          </div>
          <div class="mt-6 flex h-48 items-end justify-between gap-2" role="img" [attr.aria-label]="'admin.metrics.activity' | t">
            @for (d of days; track d; let i = $index) {
              <div class="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <div class="flex h-full items-end gap-1">
                  <span class="w-3 rounded-t sm:w-4 bg-primary" [style.height.%]="(admin.weeklyActivity.questions[i] / maxQ()) * 100" [title]="admin.weeklyActivity.questions[i]"></span>
                  <span class="w-3 rounded-t sm:w-4 bg-gold" [style.height.%]="(admin.weeklyActivity.receipts[i] / maxQ()) * 100" [title]="admin.weeklyActivity.receipts[i]"></span>
                </div>
                <span class="text-xs text-ink-muted">{{ 'admin.days.' + d | t }}</span>
              </div>
            }
          </div>
        </section>

        <section class="card space-y-4 p-5 sm:p-6">
          <h2 class="font-display text-base font-bold">{{ 'admin.metrics.targets' | t }}</h2>
          @for (g of goals; track g.key) {
            <div>
              <div class="flex justify-between text-[0.8125rem]"><span class="text-ink-body">{{ g.key | t }}</span><span class="font-display font-bold text-ink">{{ g.v }}%</span></div>
              <div class="progress-track mt-2"><div class="progress-fill" [class]="g.c" [style.width.%]="g.v"></div></div>
            </div>
          }
          <p class="note tone-warning border-t-0"><lucide-icon name="circle-alert" [size]="16" class="mt-0.5 shrink-0" />{{ 'admin.metrics.alert' | t: { n: 3 } }}</p>
        </section>
      </div>

      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr><th>{{ 'admin.cols.assistant' | t }}</th><th>{{ 'admin.cols.focus' | t }}</th><th>{{ 'admin.cols.questions' | t }}</th><th>{{ 'admin.cols.receipts' | t }}</th><th>{{ 'admin.cols.avgResponse' | t }}</th><th>{{ 'admin.cols.rating' | t }}</th><th>{{ 'admin.cols.status' | t }}</th></tr>
          </thead>
          <tbody>
            @for (a of admin.assistants(); track a.id) {
              <tr>
                <td><div class="flex items-center gap-3"><app-initials [text]="a.initials" /><p class="font-display font-semibold text-ink">{{ a.name }}</p></div></td>
                <td><div class="flex flex-wrap gap-1.5">@for (s of a.scopes; track s) { <span class="tag tone-brand">{{ 'admin.scopes.' + s | t }}</span> }</div></td>
                <td class="font-display font-semibold text-ink">{{ a.questions }}</td>
                <td>{{ a.receipts ?? '—' }}</td>
                <td class="whitespace-nowrap">{{ a.avgResponse | loc }}</td>
                <td><span class="flex items-center gap-1 font-display font-semibold text-ink"><lucide-icon name="star" [size]="14" class="fill-gold text-gold" />{{ a.rating }}</span></td>
                <td><span class="tag" [class]="presence[a.presence]">{{ 'admin.presence.' + a.presence | t }}</span></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class AdminMetricsPage {
  protected readonly admin = inject(AdminService);
  protected readonly presence = PRESENCE;
  protected readonly ranges: Range[] = ['7d', '30d', 'term'];
  protected readonly range = signal<Range>('7d');
  protected readonly days = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];
  protected readonly goals = [
    { key: 'admin.metrics.g1', v: 91, c: 'bg-success-mid' },
    { key: 'admin.metrics.g2', v: 86, c: 'bg-gold' },
    { key: 'admin.metrics.g3', v: 78, c: 'bg-primary' },
  ];
  protected readonly maxQ = computed(() => Math.max(...this.admin.weeklyActivity.questions));

  protected sum(list: number[]): number {
    return list.reduce((a, b) => a + b, 0);
  }
}
