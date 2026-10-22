import { Component, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

export type StateTone = 'success' | 'danger' | 'warning' | 'neutral' | 'progress';

/**
 * Centered status card used by payment results, access notices and empty states.
 * Project details with [details] and buttons with [actions].
 */
@Component({
  selector: 'app-state-panel',
  imports: [LucideAngularModule],
  host: { class: 'block' },
  template: `
    <div class="card mx-auto w-full max-w-[560px] px-5 py-8 text-center shadow-lift sm:px-10 sm:py-10" role="status" aria-live="polite">
      @if (tone() === 'progress') {
        <span class="mx-auto block h-16 w-16 animate-spin rounded-full border-[5px] border-surface-tint3 border-t-primary" aria-hidden="true"></span>
      } @else {
        <span class="mx-auto grid h-20 w-20 place-items-center rounded-full" [class]="toneClass()">
          <lucide-icon [name]="icon()" [size]="38" />
        </span>
      }
      <h1 class="mt-6 font-display text-2xl font-bold text-ink sm:text-[1.625rem]">{{ title() }}</h1>
      <p class="mx-auto mt-2 max-w-md text-[0.9375rem] leading-6 text-ink-body">{{ text() }}</p>
      <div class="mt-6 space-y-4 text-start empty:hidden"><ng-content select="[details]" /></div>
      <div class="mt-6 flex flex-col gap-3 empty:hidden sm:flex-row [&>*]:flex-1"><ng-content select="[actions]" /></div>
      <ng-content />
    </div>
  `,
})
export class StatePanelComponent {
  readonly icon = input('info');
  readonly tone = input<StateTone>('neutral');
  readonly title = input.required<string>();
  readonly text = input('');

  protected toneClass(): string {
    switch (this.tone()) {
      case 'success': return 'bg-success-soft text-success';
      case 'danger': return 'bg-danger-soft text-danger';
      case 'warning': return 'bg-amber-soft text-amber';
      default: return 'bg-surface-tint text-primary';
    }
  }
}
