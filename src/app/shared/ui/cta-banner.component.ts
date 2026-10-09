import { Component, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

/**
 * Gradient call-to-action band shared by every page.
 * `layout="center"` stacks content; `layout="split"` puts actions at the end on desktop.
 * Actions are projected: <app-cta-banner ...><a class="btn btn-light">…</a></app-cta-banner>
 */
@Component({
  selector: 'app-cta-banner',
  imports: [LucideAngularModule],
  host: { class: 'block' },
  template: `
    <section class="container-page py-14 md:py-20">
      <div class="banner-gradient relative isolate overflow-hidden rounded-banner px-6 py-12 text-white shadow-deep sm:px-10 md:px-14 md:py-16">
        <div class="pointer-events-none absolute -start-24 -top-24 -z-10 h-80 w-80 rounded-full border-[40px] border-white/[0.04]"></div>
        <div class="pointer-events-none absolute -bottom-32 -end-20 -z-10 h-80 w-80 rounded-full border border-white/10"></div>

        <div [class]="layout() === 'center'
            ? 'mx-auto flex max-w-3xl flex-col items-center text-center'
            : 'flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between'">
          <div [class.max-w-2xl]="layout() === 'split'">
            @if (icon()) {
              <span class="mb-5 inline-grid h-12 w-12 place-items-center rounded-full bg-gold/20 text-gold ring-1 ring-gold/40">
                <lucide-icon [name]="icon()!" [size]="22" />
              </span>
            }
            @if (eyebrow()) {
              <p class="mb-5 inline-flex rounded-full bg-white/10 px-3.5 py-1 font-display text-xs font-semibold text-white/90 ring-1 ring-white/15 backdrop-blur">
                {{ eyebrow() }}
              </p>
            }
            <h2 class="font-display text-[1.75rem] font-bold leading-tight text-white md:text-[2.25rem] md:leading-[2.75rem]">{{ title() }}</h2>
            @if (text()) {
              <p class="mt-4 text-base leading-7 text-white/80">{{ text() }}</p>
            }
          </div>
          <div class="flex flex-col gap-3 sm:flex-row" [class.mt-8]="layout() === 'center'" [class.justify-center]="layout() === 'center'">
            <ng-content />
          </div>
          @if (note()) {
            <p class="mt-6 text-xs text-white/60">{{ note() }}</p>
          }
        </div>
      </div>
    </section>
  `,
})
export class CtaBannerComponent {
  readonly title = input.required<string>();
  readonly text = input<string>();
  readonly eyebrow = input<string>();
  readonly note = input<string>();
  readonly icon = input<string>();
  readonly layout = input<'center' | 'split'>('center');
}
