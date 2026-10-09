import { Component, computed, input } from '@angular/core';

const TINTS = ['bg-surface-highlight text-primary', 'bg-gold-soft text-gold-dark', 'bg-surface-tint3 text-ink-soft', 'bg-success-soft text-success'];

/** Profile photo from the backend, or initials on a warm tint. */
@Component({
  selector: 'app-avatar',
  host: { class: 'inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-display font-bold' },
  template: `
    @if (src()) {
      <img [src]="src()" [alt]="name()" class="h-full w-full object-cover" loading="lazy" />
    } @else {
      <span class="grid h-full w-full place-items-center" [class]="tint()" [attr.aria-label]="name()" role="img">{{ initials() }}</span>
    }
  `,
})
export class AvatarComponent {
  readonly name = input.required<string>();
  readonly src = input<string | undefined>(undefined);

  protected readonly initials = computed(() =>
    this.name()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase(),
  );

  protected readonly tint = computed(() => {
    const sum = [...this.name()].reduce((a, c) => a + c.charCodeAt(0), 0);
    return TINTS[sum % TINTS.length];
  });
}
