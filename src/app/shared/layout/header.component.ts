import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { filter } from 'rxjs';
import { PublicSettingsService, isSafeBannerUrl } from '../../core/services/public-settings.service';
import { AuthService } from '../../core/data/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { LogoComponent } from '../ui/logo.component';

interface NavItem {
  path: string;
  key: string;
  exact?: boolean;
}

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, LucideAngularModule, TranslatePipe, LogoComponent],
  host: {
    class: 'sticky top-0 z-40 block border-b border-line/60 bg-white/90 backdrop-blur-md',
    '(document:keydown.escape)': 'menuOpen.set(false)',
  },
  template: `
    @if (popup(); as p) {
      @if (p.enabled && !bannerDismissed()) {
        <div class="relative isolate flex items-center justify-center gap-2 px-10 py-2 text-center text-xs font-semibold sm:text-sm"
          [class]="popupToneClass(p.type)">
          <div class="min-w-0 flex flex-wrap items-center justify-center gap-1.5 break-words sm:gap-2">
            @if (p.title) {
              <span class="inline-flex items-center gap-1 font-bold underline decoration-white/40 underline-offset-2">
                <lucide-icon name="sparkles" [size]="14" />
                {{ p.title }}:
              </span>
            }
            <span class="opacity-95">{{ p.message }}</span>
            @if (p.linkText && p.linkUrl && isSafeBannerLink(p.linkUrl)) {
              @if (isExternalUrl(p.linkUrl)) {
                <a [href]="p.linkUrl" target="_blank" rel="noopener noreferrer" class="font-bold underline hover:opacity-80 ms-1 inline-flex items-center gap-0.5">
                  {{ p.linkText }} &rarr;
                </a>
              } @else {
                <a [routerLink]="p.linkUrl" class="font-bold underline hover:opacity-80 ms-1 inline-flex items-center gap-0.5">
                  {{ p.linkText }} &rarr;
                </a>
              }
            }
          </div>
          @if (p.dismissible) {
            <button type="button" (click)="dismissPopup($event)" class="absolute end-2 sm:end-4 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-black/15 transition opacity-80 hover:opacity-100 z-10 cursor-pointer" aria-label="Dismiss banner">
              <lucide-icon name="x" [size]="14" class="pointer-events-none" />
            </button>
          }
        </div>
      }
    }

    <div class="container-page flex h-16 items-center justify-between gap-4 md:h-[72px]">
      <app-logo />

      <nav class="hidden items-center gap-1 lg:flex" [attr.aria-label]="'nav.main' | t">
        @for (item of nav; track item.path) {
          <a [routerLink]="item.path" routerLinkActive="!text-ink after:scale-x-100" [routerLinkActiveOptions]="{ exact: !!item.exact }"
            ariaCurrentWhenActive="page"
            class="relative rounded-lg px-3 py-2 font-display text-sm font-medium text-ink-body transition hover:text-ink
              after:absolute after:inset-x-3 after:-bottom-[1px] after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-primary after:transition">
            {{ item.key | t }}
            @if (item.path === '/live' && hasLiveSession()) {
              <span class="absolute -end-1 -top-0.5 flex h-2.5 w-2.5" aria-label="Live session in progress">
                <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75"></span>
                <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500"></span>
              </span>
            }
          </a>
        }
        @if (auth.user()?.role === 'admin') {
          <a routerLink="/admin" routerLinkActive="!bg-amber-100 !border-amber-400"
            class="ms-2 inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 font-display text-xs font-bold text-amber-900 shadow-xs transition hover:bg-amber-100 hover:text-amber-950">
            <lucide-icon name="shield-check" [size]="15" class="text-amber-600" />
            {{ 'nav.admin' | t }}
          </a>
        }
        @if (auth.user()?.role === 'assistant') {
          <a routerLink="/assistant" routerLinkActive="!bg-blue-100 !border-blue-400"
            class="ms-2 inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 font-display text-xs font-bold text-blue-900 shadow-xs transition hover:bg-blue-100 hover:text-blue-950">
            <lucide-icon name="user-check" [size]="15" class="text-blue-600" />
            {{ i18n.lang() === 'ar' ? 'بوابة المساعد' : 'Assistant Portal' }}
          </a>
        }
      </nav>

      <div class="hidden items-center gap-2.5 lg:flex">
        <button type="button" (click)="i18n.toggle()" [attr.aria-label]="'nav.switchLangLabel' | t"
          class="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-white px-3.5 text-sm font-semibold text-ink-body transition hover:border-primary/40 hover:text-ink">
          <lucide-icon name="languages" [size]="16" />
          <span [attr.lang]="i18n.lang() === 'en' ? 'ar' : 'en'">{{ 'nav.switchLang' | t }}</span>
        </button>

        @if (auth.user(); as u) {
          <!-- Logged-in profile in the right corner -->
          <div class="flex items-center gap-2">
            <a [routerLink]="u.role === 'admin' ? '/admin' : u.role === 'assistant' ? '/assistant' : '/progress'"
              class="flex items-center gap-2.5 rounded-full border border-line bg-surface-warm/70 py-1 pe-3 ps-1 transition hover:border-primary/50 hover:bg-surface-tint shadow-sm">
              <span class="grid h-8 w-8 place-items-center rounded-full bg-primary font-display text-xs font-bold text-white shadow-sm ring-2 ring-white">
                {{ u.initials || 'ST' }}
              </span>
              <div class="flex flex-col text-start">
                <span class="font-display text-xs font-bold text-ink leading-tight line-clamp-1 max-w-[130px]">{{ u.fullName }}</span>
                <span class="text-[0.6875rem] font-semibold text-primary leading-none">
                  {{ u.role === 'admin' ? ('admin.panel' | t) : u.role === 'assistant' ? (i18n.lang() === 'ar' ? 'مساعد المعلم' : 'Assistant') : ('stagesShort.' + (u.stage || 'sec3') | t) }}
                </span>
              </div>
            </a>
            
            <button type="button" (click)="auth.logout()" title="Logout"
              class="grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-ink-muted transition hover:border-danger/40 hover:text-danger hover:bg-red-50">
              <lucide-icon name="lock" [size]="15" />
            </button>
          </div>
        } @else {
          <!-- Guest buttons -->
          <a routerLink="/login" class="btn btn-ghost">{{ 'nav.login' | t }}</a>
          <a routerLink="/signup" class="btn btn-primary">{{ 'nav.signup' | t }}</a>
        }
      </div>

      <div class="flex items-center gap-1.5 lg:hidden">
        <button type="button" (click)="i18n.toggle()" [attr.aria-label]="'nav.switchLangLabel' | t"
          class="grid h-10 w-10 place-items-center rounded-full text-ink-body hover:bg-surface-tint">
          <lucide-icon name="languages" [size]="20" />
        </button>

        @if (auth.user(); as u) {
          <a routerLink="/progress"
            class="grid h-9 w-9 place-items-center rounded-full bg-primary font-display text-xs font-bold text-white shadow-sm">
            {{ u.initials || 'ST' }}
          </a>
        }

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
          @if (isStaff()) {
            <a routerLink="/admin" class="mb-2 flex items-center gap-2.5 rounded-card border border-amber-200 bg-amber-50 px-3 py-2.5 font-display text-sm font-bold text-amber-900 shadow-xs">
              <lucide-icon name="shield-check" [size]="18" class="text-amber-600" />
              {{ 'nav.admin' | t }}
            </a>
          }
          @for (item of nav; track item.path) {
            <a [routerLink]="item.path" routerLinkActive="bg-surface-tint !text-ink" [routerLinkActiveOptions]="{ exact: !!item.exact }"
              ariaCurrentWhenActive="page"
              class="relative rounded-card px-3 py-3 font-display text-[0.9375rem] font-medium text-ink-body">
              {{ item.key | t }}
              @if (item.path === '/live' && hasLiveSession()) {
                <span class="ms-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 font-display text-[0.6875rem] font-bold text-red-600">
                  <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500"></span>
                  {{ 'nav.liveNow' | t }}
                </span>
              }
            </a>
          }

          @if (auth.user(); as u) {
            <div class="mt-3 flex items-center justify-between border-t border-line/60 pt-4 px-2">
              <a routerLink="/progress" class="flex items-center gap-3">
                <span class="grid h-9 w-9 place-items-center rounded-full bg-primary font-display text-xs font-bold text-white shadow-sm">
                  {{ u.initials || 'ST' }}
                </span>
                <div>
                  <p class="font-display text-sm font-bold text-ink">{{ u.fullName }}</p>
                  <p class="text-xs text-ink-muted">{{ u.email }}</p>
                </div>
              </a>
              <button type="button" (click)="auth.logout()" class="btn btn-soft btn-sm text-danger">
                Logout
              </button>
            </div>
          } @else {
            <div class="mt-3 grid grid-cols-2 gap-3 border-t border-line/60 pt-4">
              <a routerLink="/login" class="btn btn-soft">{{ 'nav.login' | t }}</a>
              <a routerLink="/signup" class="btn btn-primary">{{ 'nav.signup' | t }}</a>
            </div>
          }
        </nav>
      </div>
    }
  `,
})
export class HeaderComponent {
  protected readonly i18n = inject(LanguageService);
  protected readonly auth = inject(AuthService);
  private readonly publicSettings = inject(PublicSettingsService);
  protected readonly menuOpen = signal(false);

  protected readonly isStaff = computed(() => {
    try {
      if (typeof this.auth?.isStaff === 'function') {
        return this.auth.isStaff();
      }
      const role = this.auth?.user?.()?.role;
      return role === 'admin' || role === 'assistant';
    } catch {
      return false;
    }
  });

  /** True when at least one live class currently has status === 'live'. Powers the navbar badge. */
  protected readonly hasLiveSession = computed(() =>
    this.publicSettings.liveClasses().some((s) => s.status === 'live')
  );

  protected readonly popup = this.publicSettings.activePopup;
  private readonly locallyDismissedKey = signal<string | null>(null);

  protected readonly bannerDismissed = computed(() => {
    const p = this.popup();
    if (!p || !p.enabled) return true;
    const key = this.publicSettings.getBannerDismissKey(p);
    if (this.locallyDismissedKey() === key) return true;
    return this.publicSettings.isBannerDismissed(p);
  });
  protected readonly popupDismissed = this.bannerDismissed;

  protected dismissPopup(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const p = this.popup();
    if (p) {
      const key = this.publicSettings.getBannerDismissKey(p);
      this.locallyDismissedKey.set(key);
      this.publicSettings.dismissBanner(p);
    }
  }

  protected dismissBanner(event?: Event): void {
    this.dismissPopup(event);
  }

  protected isExternalUrl(url?: string | null): boolean {
    if (!url) return false;
    return /^https?:\/\//i.test(url.trim());
  }

  protected isSafeBannerLink(url?: string | null): boolean {
    return isSafeBannerUrl(url);
  }

  protected popupToneClass(type?: string): string {
    switch (type) {
      case 'warning':
        return 'bg-amber-800 text-white';
      case 'success':
        return 'bg-emerald-700 text-white';
      case 'info':
        return 'bg-sky-800 text-white';
      case 'announcement':
      default:
        return 'bg-primary text-white';
    }
  }

  protected readonly nav: NavItem[] = [
    { path: '/', key: 'nav.home', exact: true },
    { path: '/lectures', key: 'nav.lectures' },
    { path: '/live', key: 'nav.live' },
    { path: '/quizzes', key: 'nav.quizzes' },
    { path: '/progress', key: 'nav.progress' },
  ];

  constructor() {
    inject(Router)
      .events.pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.menuOpen.set(false));
  }
}
