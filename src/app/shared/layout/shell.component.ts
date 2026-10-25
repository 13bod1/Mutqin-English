import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PublicSettingsService } from '../../core/services/public-settings.service';
import { FooterComponent } from './footer.component';
import { HeaderComponent } from './header.component';

/** Page frame shared by every route: header, content, footer. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  host: { class: 'flex min-h-dvh flex-col' },
  template: `
    <app-header />
    <main id="main" class="flex-1"><router-outlet /></main>
    <app-footer />
    <!-- Floating WhatsApp Support Button -->
    <a
      href="https://wa.me/201100764511"
      target="_blank"
      rel="noopener"
      aria-label="WhatsApp Support 01100764511"
      title="WhatsApp Support: 01100764511"
      class="fixed bottom-6 end-6 z-50 flex items-center gap-2.5 rounded-full bg-emerald-700 px-4 py-3 text-white shadow-xl transition-all duration-300 hover:bg-emerald-800 hover:scale-105 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-emerald-300"
    >
      <svg class="h-6 w-6 fill-white shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.28-2.42 5.83a8.19 8.19 0 0 1-5.82 2.41c-1.44 0-2.85-.38-4.09-1.11l-.29-.18-3.04.8 1.05-2.96-.19-.31c-.8-1.3-1.22-2.82-1.22-4.48 0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.25-1.5-1.4-1.75-.14-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.72 4.31 3.81.6.26 1.07.42 1.44.54.61.19 1.16.17 1.6.1.49-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.1-.23-.17-.48-.29z"/>
      </svg>
      <span class="font-display text-sm font-bold hidden sm:inline-block">واتساب الدعم (01100764511)</span>
      <span class="font-display text-xs font-bold sm:hidden">01100764511</span>
    </a>

  `,
})
export class ShellComponent {
  protected readonly publicSettings = inject(PublicSettingsService);

  constructor() {
    this.publicSettings.applyInitialThemes();
  }
}
