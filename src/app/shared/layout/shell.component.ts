import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AdminService } from '../../core/data/admin.service';
import { FooterComponent } from './footer.component';
import { HeaderComponent } from './header.component';

/** Page frame shared by every route: header, content, footer. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, HeaderComponent, FooterComponent, LucideAngularModule],
  host: { class: 'flex min-h-dvh flex-col' },
  template: `
    @if (popup(); as p) {
      @if (p.enabled && p.message && !dismissed()) {
        <div class="relative z-40 py-2 px-4 text-center text-xs font-semibold text-white shadow-sm transition-all"
          [class]="p.type === 'warning' ? 'bg-amber-600' : p.type === 'success' ? 'bg-emerald-700' : p.type === 'info' ? 'bg-blue-600' : 'bg-primary'">
          <div class="mx-auto flex max-w-5xl items-center justify-center gap-2">
            <lucide-icon name="megaphone" [size]="15" class="shrink-0" />
            <span>@if (p.title) { <strong class="font-bold me-1">{{ p.title }}:</strong> }{{ p.message }}</span>
            @if (p.linkText && p.linkUrl) {
              <a [href]="p.linkUrl" class="ms-1 underline font-bold hover:opacity-90 inline-flex items-center gap-0.5">
                {{ p.linkText }} &rarr;
              </a>
            }
            @if (p.dismissible) {
              <button type="button" (click)="dismissed.set(true)" class="ms-3 rounded p-0.5 hover:bg-white/20 text-white/90" title="Dismiss announcement">
                <lucide-icon name="x" [size]="14" />
              </button>
            }
          </div>
        </div>
      }
    }
    <app-header />
    <main id="main" class="flex-1"><router-outlet /></main>
    <app-footer />
  `,
})
export class ShellComponent {
  protected readonly admin = inject(AdminService);
  protected readonly popup = this.admin.activePopup;
  protected readonly dismissed = signal(false);

  constructor() {
    this.admin.applyInitialThemes();
  }
}

