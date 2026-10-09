import { Component, input } from '@angular/core';

/** Eyebrow + heading + optional subtitle, used at the top of most sections. */
@Component({
  selector: 'app-section-header',
  host: { class: 'block' },
  template: `
    <div [class]="align() === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-2xl'">
      @if (eyebrow()) {
        <p class="eyebrow mb-3">{{ eyebrow() }}</p>
      }
      <h2 class="h-section">{{ title() }}</h2>
      @if (subtitle()) {
        <p class="mt-3 text-base leading-7 text-ink-body md:text-lg md:leading-7">{{ subtitle() }}</p>
      }
    </div>
  `,
})
export class SectionHeaderComponent {
  readonly eyebrow = input<string>();
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly align = input<'center' | 'start'>('center');
}
