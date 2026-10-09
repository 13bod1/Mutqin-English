import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { filter } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { LogoComponent } from '../ui/logo.component';

interface NavItem {
  path: string;
  key: string;
  exact?: boolean;
}

/** Shared top navigation (based on the Landing page header). */
@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, LucideAngularModule, TranslatePipe, LogoComponent],
  host: {
    class: 'sticky top-0 z-40 block border-b border-line/60 bg-white/90 backdrop-blur-md',
    '(document:keydown.escape)': 'menuOpen.set(false)',
  },
  template: `
    <div class="container-page flex h-16 items-center justify-between gap-4 md:h-[72px]">
      <app-logo />

      <nav class="hidden items-center gap-1 lg:flex" [attr.aria-label]="'nav.main' | t">
        @for (item of nav; track item.path) {
          <a [routerLink]="item.path" routerLinkActive="!text-ink after:scale-x-100" [routerLinkActiveOptions]="{ exact: !!item.exact }"
            ariaCurrentWhenActive="page"
            class="relative rounded-lg px-3 py-2 font-display text-sm font-medium text-ink-body transition hover:text-ink
              after:absolute after:inset-x-3 after:-bottom-[1px] after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-primary after:transition">
            {{ item.key | t }}
          </a>
        }
      </nav>

      <div class="hidden items-center gap-2 lg:flex">
        <button type="button" (click)="i18n.toggle()" [attr.aria-label]="'nav.switchLangLabel' | t"
          class="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-white px-3.5 text-sm font-semibold text-ink-body transition hover:border-primary/40 hover:text-ink">
          <lucide-icon name="languages" [size]="16" />
          <span [attr.lang]="i18n.lang() === 'en' ? 'ar' : 'en'">{{ 'nav.switchLang' | t }}</span>
        </button>
        <a routerLink="/login" class="btn btn-ghost">{{ 'nav.login' | t }}</a>
        <a routerLink="/signup" class="btn btn-primary">{{ 'nav.signup' | t }}</a>
      </div>

      <div class="flex items-center gap-1 lg:hidden">
        <button type="button" (click)="i18n.toggle()" [attr.aria-label]="'nav.switchLangLabel' | t"
          class="grid h-10 w-10 place-items-center rounded-full text-ink-body hover:bg-surface-tint">
          <lucide-icon name="languages" [size]="20" />
        </button>
        <button type="button" (click)="menuOpen.set(!menuOpen())" [attr.aria-expanded]="menuOpen()" aria-controls="mobile-menu"
          [attr.aria-label]="(menuOpen() ? 'nav.closeMenu' : 'nav.openMenu') | t"
          class="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-surface-tint">
          <lucide-icon [name]="menuOpen() ? 'x' : 'menu'" [size]="22" />
        </button>
      </div>
    </div>

    @if (menuOpen()) {
      <div id="mobile-menu" class="border-t border-line/60 bg-white lg:hidden">
        <nav class="container-page flex flex-col py-3" [attr.aria-label]="'nav.main' | t">
          @for (item of nav; track item.path) {
            <a [routerLink]="item.path" routerLinkActive="bg-surface-tint !text-ink" [routerLinkActiveOptions]="{ exact: !!item.exact }"
              ariaCurrentWhenActive="page"
              class="rounded-card px-3 py-3 font-display text-[0.9375rem] font-medium text-ink-body">
              {{ item.key | t }}
            </a>
          }
          <div class="mt-3 grid grid-cols-2 gap-3 border-t border-line/60 pt-4">
            <a routerLink="/login" class="btn btn-soft">{{ 'nav.login' | t }}</a>
            <a routerLink="/signup" class="btn btn-primary">{{ 'nav.signup' | t }}</a>
          </div>
        </nav>
      </div>
    }
  `,
})
export class HeaderComponent {
  protected readonly i18n = inject(LanguageService);
  protected readonly menuOpen = signal(false);

  protected readonly nav: NavItem[] = [
    { path: '/', key: 'nav.home', exact: true },
    { path: '/lectures', key: 'nav.lectures' },
    { path: '/quizzes', key: 'nav.quizzes' },
    { path: '/progress', key: 'nav.progress' },
  ];

  constructor() {
    inject(Router)
      .events.pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.menuOpen.set(false));
  }
}
