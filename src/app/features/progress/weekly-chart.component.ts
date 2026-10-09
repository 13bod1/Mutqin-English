import { Component, computed, input } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { WeekDay } from '../../core/models/progress';

/** Bar chart of active study minutes per day; the busiest day is highlighted. */
@Component({
  selector: 'app-weekly-chart',
  imports: [TranslatePipe],
  host: { class: 'block' },
  template: `
    <div class="flex h-56 items-end gap-2 border-b border-line pb-px sm:gap-4" role="img"
      [attr.aria-label]="'progress.activity.title' | t">
      @for (d of bars(); track d.day) {
        <div class="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
          @if (d.peak) {
            <span class="whitespace-nowrap rounded-full bg-gold px-2 py-0.5 font-display text-[0.625rem] font-bold text-white">★ {{ 'progress.activity.peakTag' | t }}</span>
          }
          <span class="font-display text-xs font-semibold tabular-nums" [class]="d.peak ? 'text-ink' : 'text-ink-muted'">
            {{ 'common.minutesShort' | t: { n: d.minutes } }}
          </span>
          <div class="w-full max-w-12 rounded-t-lg transition-[height] duration-700"
            [class]="d.peak ? 'bg-primary' : 'bg-surface-tint3 hover:bg-line'"
            [style.height.%]="d.height"></div>
        </div>
      }
    </div>
    <div class="mt-2 flex gap-2 sm:gap-4">
      @for (d of bars(); track d.day) {
        <span class="flex-1 text-center font-display text-xs" [class]="d.peak ? 'font-bold text-ink' : 'text-ink-muted'">
          {{ 'progress.days.' + d.day | t }}
        </span>
      }
    </div>
  `,
})
export class WeeklyChartComponent {
  readonly data = input.required<{ day: WeekDay; minutes: number }[]>();

  protected readonly bars = computed(() => {
    const max = Math.max(1, ...this.data().map((d) => d.minutes));
    return this.data().map((d) => ({
      ...d,
      // Leave headroom above the tallest bar for its labels.
      height: Math.max(4, (d.minutes / max) * 72),
      peak: d.minutes === max,
    }));
  });
}
