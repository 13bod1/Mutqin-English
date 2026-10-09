import { Component, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

/**
 * Shows `src` when the backend provides an image; otherwise a branded placeholder.
 * Size and corner radius come from the host element's classes.
 */
@Component({
  selector: 'app-media',
  imports: [LucideAngularModule],
  host: { class: 'relative block overflow-hidden' },
  template: `
    @if (src()) {
      <img [src]="src()" [alt]="alt()" class="h-full w-full object-cover" loading="lazy" />
    } @else {
      <div
        class="flex h-full w-full flex-col items-center justify-center gap-2"
        [class]="tone() === 'dark' ? 'bg-gradient-to-br from-primary via-primary-mid to-primary-light text-white/80' : 'bg-gradient-to-br from-surface-tint2 via-surface-tint to-surface-highlight text-primary/45'"
        role="img"
        [attr.aria-label]="alt()"
      >
        <svg class="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]" aria-hidden="true">
          <defs>
            <pattern [attr.id]="patternId" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.4" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" [attr.fill]="'url(#' + patternId + ')'" />
        </svg>
        <lucide-icon [name]="icon()" [size]="iconSize()" [strokeWidth]="1.6" />
        @if (label()) {
          <span class="relative px-3 text-center font-display text-xs font-semibold opacity-80">{{ label() }}</span>
        }
      </div>
    }
    <ng-content />
  `,
})
export class MediaComponent {
  private static seq = 0;
  readonly src = input<string | undefined>(undefined);
  readonly alt = input('');
  readonly icon = input('graduation-cap');
  readonly iconSize = input(40);
  readonly label = input<string | undefined>(undefined);
  readonly tone = input<'warm' | 'dark'>('warm');
  protected readonly patternId = `media-dots-${MediaComponent.seq++}`;
}
