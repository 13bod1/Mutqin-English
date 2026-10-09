import { Component, computed, input } from '@angular/core';

/** Circular progress indicator; projected content sits in the middle. */
@Component({
  selector: 'app-progress-ring',
  host: { class: 'relative inline-grid shrink-0 place-items-center' },
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" [attr.viewBox]="'0 0 ' + size() + ' ' + size()" class="-rotate-90" aria-hidden="true">
      <circle [attr.cx]="c()" [attr.cy]="c()" [attr.r]="r()" fill="none" stroke="#EDE0DC" [attr.stroke-width]="stroke()" />
      <circle [attr.cx]="c()" [attr.cy]="c()" [attr.r]="r()" fill="none" [attr.stroke]="color()" [attr.stroke-width]="stroke()"
        stroke-linecap="round" [attr.stroke-dasharray]="circ()" [attr.stroke-dashoffset]="offset()"
        class="transition-[stroke-dashoffset] duration-700" />
    </svg>
    <div class="absolute inset-0 grid place-items-center text-center"><ng-content /></div>
  `,
})
export class ProgressRingComponent {
  readonly percent = input.required<number>();
  readonly size = input(72);
  readonly stroke = input(7);
  readonly color = input('#4E342E');

  protected readonly c = computed(() => this.size() / 2);
  protected readonly r = computed(() => (this.size() - this.stroke()) / 2);
  protected readonly circ = computed(() => 2 * Math.PI * this.r());
  protected readonly offset = computed(() => this.circ() * (1 - Math.min(100, Math.max(0, this.percent())) / 100));
}
