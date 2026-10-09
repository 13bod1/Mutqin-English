import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { LogoComponent } from '../ui/logo.component';

/** Shared footer (based on the Landing page footer). Links without a page yet point to "#". */
@Component({
  selector: 'app-footer',
  imports: [RouterLink, LucideAngularModule, TranslatePipe, LogoComponent],
  host: { class: 'block border-t border-line/60 bg-surface-tint' },
  template: `
    <div class="container-page pb-8 pt-12">
      <div class="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div class="max-w-sm">
          <app-logo [compact]="true" />
          <p class="mt-4 text-sm leading-6 text-ink-body">{{ 'footer.description' | t }}</p>
          <a href="https://wa.me/" target="_blank" rel="noopener"
            class="mt-5 inline-flex items-center gap-2 rounded-full border border-success/30 bg-white px-4 py-2 font-display text-xs font-semibold text-success shadow-card transition hover:bg-success-soft">
            <lucide-icon name="message-circle" [size]="15" />
            {{ 'footer.whatsapp' | t }}
          </a>
        </div>

        <div>
          <h3 class="font-display text-base font-bold">{{ 'footer.curriculum' | t }}</h3>
          <ul class="mt-4 space-y-3 text-sm">
            <li><a routerLink="/lectures" class="text-ink-body hover:text-ink">{{ 'nav.lectures' | t }}</a></li>
            <li><a routerLink="/quizzes" class="text-ink-body hover:text-ink">{{ 'nav.quizzes' | t }}</a></li>
            <li><a href="#" class="text-ink-body hover:text-ink">{{ 'footer.studyGuides' | t }}</a></li>
          </ul>
        </div>

        <div>
          <h3 class="font-display text-base font-bold">{{ 'footer.academy' | t }}</h3>
          <ul class="mt-4 space-y-3 text-sm">
            <li><a href="#" class="text-ink-body hover:text-ink">{{ 'footer.placementTest' | t }}</a></li>
            <li><a href="#" class="text-ink-body hover:text-ink">{{ 'footer.methodology' | t }}</a></li>
            <li><a href="#" class="text-ink-body hover:text-ink">{{ 'footer.privacy' | t }}</a></li>
            <li><a href="#" class="text-ink-body hover:text-ink">{{ 'footer.terms' | t }}</a></li>
          </ul>
        </div>

        <div>
          <h3 class="font-display text-base font-bold">{{ 'footer.support' | t }}</h3>
          <p class="mt-4 text-sm leading-6 text-ink-body">{{ 'footer.hours' | t }}</p>
          <div class="mt-4 flex gap-2">
            @for (s of socials; track s.icon) {
              <a href="#" [attr.aria-label]="s.label | t"
                class="grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-ink-soft transition hover:border-primary/40 hover:text-primary">
                <lucide-icon [name]="s.icon" [size]="16" />
              </a>
            }
          </div>
        </div>
      </div>

      <div class="mt-10 flex flex-col gap-3 border-t border-line/70 pt-6 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
        <p>{{ 'footer.rights' | t: { year: year } }}</p>
        <div class="flex gap-6">
          <a href="#" class="hover:text-ink">{{ 'footer.privacy' | t }}</a>
          <a href="#" class="hover:text-ink">{{ 'footer.terms' | t }}</a>
        </div>
      </div>
    </div>
  `,
})
export class FooterComponent {
  protected readonly year = new Date().getFullYear();
  protected readonly socials = [
    { icon: 'youtube', label: 'footer.youtube' },
    { icon: 'podcast', label: 'footer.podcast' },
    { icon: 'mail', label: 'footer.email' },
  ];
}
