import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/** Mutqin English brand mark — the single logo used across all pages. */
@Component({
  selector: 'app-logo',
  imports: [RouterLink, LucideAngularModule, TranslatePipe],
  template: `
    <a routerLink="/" class="group inline-flex items-center gap-2.5" [attr.aria-label]="'brand.name' | t">
      <span
        class="grid shrink-0 place-items-center rounded-[10px] bg-primary text-white shadow-btn transition group-hover:bg-primary-hover"
        [class]="compact() ? 'h-8 w-8' : 'h-9 w-9'"
      >
        <lucide-icon name="book-open" [size]="compact() ? 16 : 19" [strokeWidth]="2.2" />
      </span>
      <span class="font-display font-bold tracking-tight" [class]="compact() ? 'text-lg' : 'text-xl'"
        [class.text-white]="inverted()" [class.text-ink]="!inverted()">{{ 'brand.name' | t }}</span>
    </a>
  `,
})
export class LogoComponent {
  readonly compact = input(false);
  readonly inverted = input(false);
}
