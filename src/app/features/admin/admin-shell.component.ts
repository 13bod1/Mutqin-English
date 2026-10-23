import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { filter } from 'rxjs';
import { AdminService } from '../../core/data/admin.service';
import { AuthService } from '../../core/data/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/** Layout for /admin: brand sidebar + top bar. Separate from the student site's header/footer. */
@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, TranslatePipe],
  host: { class: 'flex min-h-dvh overflow-x-clip bg-surface-page', '(document:keydown.escape)': 'open.set(false)' },
  template: `
    <a href="#admin-main" class="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-card focus:bg-white focus:p-3">{{ 'admin.skip' | t }}</a>

    @if (open()) {
      <div class="fixed inset-0 z-40 bg-ink/45 lg:hidden" (click)="open.set(false)" aria-hidden="true"></div>
    }

    <aside id="admin-nav" class="fixed inset-y-0 start-0 z-50 flex w-64 flex-col gap-7 bg-primary px-4 py-6 text-white lg:sticky lg:top-0 lg:h-dvh"
      [class]="open() ? '' : 'max-lg:hidden'">
      <a routerLink="/admin" class="flex items-center gap-2.5 px-1">
        <span class="grid h-9 w-9 place-items-center rounded-[10px] bg-white text-primary"><lucide-icon name="book-open" [size]="19" /></span>
        <span>
          <span class="block font-display text-base font-bold leading-5">{{ 'brand.name' | t }}</span>
          <span class="block font-display text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-white/60">{{ 'admin.panel' | t }}</span>
        </span>
      </a>

      <nav class="flex flex-col gap-1" [attr.aria-label]="'admin.navLabel' | t">
        <p class="mb-2 px-3 font-display text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-white/50">{{ 'admin.workspace' | t }}</p>
        @for (item of nav; track item.path) {
          <a [routerLink]="item.path" routerLinkActive="!bg-white !text-primary font-bold" [routerLinkActiveOptions]="{ exact: !!item.exact }" ariaCurrentWhenActive="page"
            class="flex items-center justify-between gap-3 rounded-card px-3 py-2.5 font-display text-sm font-medium text-white/85 transition hover:bg-white/10">
            <span class="flex items-center gap-3"><lucide-icon [name]="item.icon" [size]="18" />{{ item.key | t }}</span>
            @if (item.path === '/admin/payments' && admin.pendingCount()) {
              <span class="rounded-full bg-gold px-2 py-px font-display text-[0.6875rem] font-bold text-white">{{ admin.pendingCount() }}</span>
            }
          </a>
        }
      </nav>

      <a routerLink="/" class="mt-auto flex items-center gap-2.5 rounded-card border border-white/20 px-3 py-2.5 font-display text-[0.8125rem] font-medium text-white/85 hover:bg-white/10">
        <lucide-icon name="external-link" [size]="16" />{{ 'admin.viewSite' | t }}
      </a>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line/60 bg-white/95 px-4 backdrop-blur md:h-[72px] md:px-8">
        <div class="flex min-w-0 flex-1 items-center gap-3">
          <button type="button" class="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-surface-tint lg:hidden" (click)="open.set(true)"
            aria-controls="admin-nav" [attr.aria-expanded]="open()" [attr.aria-label]="'nav.openMenu' | t">
            <lucide-icon name="menu" [size]="22" />
          </button>
          <label class="relative hidden w-full max-w-[380px] sm:block">
            <span class="sr-only">{{ 'admin.search' | t }}</span>
            <lucide-icon name="search" [size]="16" class="input-icon start-3.5" />
            <input type="search" class="input h-10 bg-surface-page ps-10 text-sm" [placeholder]="'admin.search' | t" />
          </label>
        </div>
        <div class="flex shrink-0 items-center gap-2 md:gap-3">
          <a routerLink="/"
            class="inline-flex h-9 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 text-xs font-bold text-primary transition hover:bg-primary hover:text-white">
            <lucide-icon name="external-link" [size]="14" />
            <span>{{ 'admin.viewSite' | t }}</span>
          </a>
          <button type="button" (click)="i18n.toggle()" [attr.aria-label]="'nav.switchLangLabel' | t"
            class="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-white px-3 text-sm font-semibold text-ink-body hover:text-ink">
            <lucide-icon name="languages" [size]="16" /><span class="hide-mobile">{{ 'nav.switchLang' | t }}</span>
          </button>
          <button type="button" class="relative grid h-10 w-10 place-items-center rounded-full border border-line" [attr.aria-label]="'admin.notifications' | t">
            <lucide-icon name="bell" [size]="18" />
            <span class="absolute end-2 top-2 h-2 w-2 rounded-full bg-red-600"></span>
          </button>
          <div class="flex items-center gap-2.5">
            <span class="grid h-9 w-9 place-items-center rounded-full bg-primary font-display text-xs font-bold text-white">{{ auth.user()?.initials || 'AM' }}</span>
            <span class="hidden md:block">
              <span class="block font-display text-sm font-bold text-ink">{{ auth.user()?.fullName || ('brand.name' | t) }}</span>
              <span class="block text-xs text-ink-muted">{{ 'admin.roleLabel' | t }}</span>
            </span>
          </div>
        </div>
      </header>
      <main id="admin-main" class="flex-1 px-4 py-6 md:px-8 md:py-8"><router-outlet /></main>
    </div>
  `,
})
export class AdminShellComponent {
  protected readonly i18n = inject(LanguageService);
  protected readonly auth = inject(AuthService);
  protected readonly admin = inject(AdminService);
  protected readonly open = signal(false);

  protected readonly nav = [
    { path: '/admin', key: 'admin.nav.dashboard', icon: 'layout-dashboard', exact: true },
    { path: '/admin/users', key: 'admin.nav.users', icon: 'users' },
    { path: '/admin/lectures', key: 'admin.nav.lectures', icon: 'monitor-play' },
    { path: '/admin/live', key: 'admin.nav.live', icon: 'radio' },
    { path: '/admin/payments', key: 'admin.nav.payments', icon: 'receipt' },
    { path: '/admin/announcements', key: 'admin.nav.announcements', icon: 'megaphone' },
    { path: '/admin/metrics', key: 'admin.nav.metrics', icon: 'chart-column' },
    { path: '/admin/settings', key: 'admin.nav.settings', icon: 'settings' },
  ];

  constructor() {
    inject(Router).events.pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed()).subscribe(() => this.open.set(false));
  }
}
