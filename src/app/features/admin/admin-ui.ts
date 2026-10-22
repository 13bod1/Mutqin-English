import { Component, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/** Title row of every admin page; project buttons as content. */
@Component({
  selector: 'app-admin-header',
  host: { class: 'flex flex-col gap-4 md:flex-row md:items-end md:justify-between' },
  template: `
    <div>
      <h1 class="font-display text-2xl font-bold leading-8 md:text-[1.75rem] md:leading-9">{{ title() }}</h1>
      @if (subtitle()) { <p class="mt-1.5 max-w-2xl text-[0.9375rem] text-ink-body">{{ subtitle() }}</p> }
    </div>
    <div class="flex flex-wrap items-center gap-3 empty:hidden"><ng-content /></div>
  `,
})
export class AdminHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}

/** KPI card. */
@Component({
  selector: 'app-stat',
  imports: [LucideAngularModule],
  host: { class: 'stat-card' },
  template: `
    <div class="flex items-center justify-between gap-2">
      <span class="stat-label">{{ label() }}</span>
      <span class="icon-tile h-9 w-9" [class]="tone()"><lucide-icon [name]="icon()" [size]="17" /></span>
    </div>
    <p class="stat-value truncate" [class]="valueClass()">{{ value() }}</p>
    @if (note()) {
      <p class="flex items-center gap-1.5 text-xs" [class]="noteClass() || 'text-ink-muted'">
        @if (noteIcon()) { <lucide-icon [name]="noteIcon()" [size]="13" /> }
        {{ note() }}
      </p>
    }
  `,
})
export class StatComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly icon = input('activity');
  readonly tone = input('');
  readonly note = input('');
  readonly noteIcon = input('');
  readonly noteClass = input('');
  readonly valueClass = input('');
}

/** Side drawer (end side) with scrim. */
@Component({
  selector: 'app-drawer',
  imports: [LucideAngularModule, TranslatePipe],
  host: { '(document:keydown.escape)': 'closed.emit()' },
  template: `
    <div class="fixed inset-0 z-[60] bg-ink/45" (click)="closed.emit()" aria-hidden="true"></div>
    <section class="fixed inset-y-0 end-0 z-[61] flex w-full max-w-[460px] flex-col bg-white shadow-deep" role="dialog" aria-modal="true" [attr.aria-label]="title()">
      <header class="flex items-start justify-between gap-3 border-b border-line/60 p-5 sm:p-6">
        <div>
          <h2 class="font-display text-xl font-bold">{{ title() }}</h2>
          @if (subtitle()) { <p class="mt-0.5 text-[0.8125rem] text-ink-muted">{{ subtitle() }}</p> }
        </div>
        <button type="button" class="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line hover:bg-surface-tint" (click)="closed.emit()" [attr.aria-label]="'common.close' | t">
          <lucide-icon name="x" [size]="18" />
        </button>
      </header>
      <div class="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6"><ng-content /></div>
      <footer class="flex gap-3 border-t border-line/60 p-5 empty:hidden sm:p-6 [&>*]:flex-1"><ng-content select="[footer]" /></footer>
    </section>
  `,
})
export class DrawerComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly closed = output<void>();
}

/** Small round initials avatar used in tables. */
@Component({
  selector: 'app-initials',
  host: { class: 'grid shrink-0 place-items-center rounded-full font-display font-bold', '[class]': 'cls()' },
  template: `{{ text() }}`,
})
export class InitialsComponent {
  readonly text = input.required<string>();
  readonly dark = input(false);
  readonly size = input<'sm' | 'md'>('md');
  protected cls(): string {
    const s = this.size() === 'sm' ? 'h-8 w-8 text-[0.6875rem]' : 'h-9 w-9 text-xs';
    return `${s} ${this.dark() ? 'bg-primary text-white' : 'bg-surface-highlight text-primary'}`;
  }
}
