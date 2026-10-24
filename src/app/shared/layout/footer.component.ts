import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { LogoComponent } from '../ui/logo.component';

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
          
          <div class="mt-5 flex flex-col gap-2">
            <a href="https://wa.me/201100764511" target="_blank" rel="noopener"
              class="inline-flex items-center gap-2.5 rounded-full border border-emerald-500/30 bg-emerald-50 px-4 py-2 font-display text-xs font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-100 hover:shadow-md">
              <svg class="h-4 w-4 fill-emerald-600" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.28-2.42 5.83a8.19 8.19 0 0 1-5.82 2.41c-1.44 0-2.85-.38-4.09-1.11l-.29-.18-3.04.8 1.05-2.96-.19-.31c-.8-1.3-1.22-2.82-1.22-4.48 0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.25-1.5-1.4-1.75-.14-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.72 4.31 3.81.6.26 1.07.42 1.44.54.61.19 1.16.17 1.6.1.49-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.1-.23-.17-.48-.29z"/>
              </svg>
              <span>{{ 'footer.whatsapp' | t }}: <strong class="font-bold ltr:tracking-wide">01100764511</strong></span>
            </a>
          </div>
        </div>

        <div>
          <h3 class="font-display text-base font-bold">{{ 'footer.curriculum' | t }}</h3>
          <ul class="mt-4 space-y-3 text-sm">
            <li><a routerLink="/lectures" class="text-ink-body hover:text-ink">{{ 'nav.lectures' | t }}</a></li>
            <li><a routerLink="/quizzes" class="text-ink-body hover:text-ink">{{ 'nav.quizzes' | t }}</a></li>
            <li>
              <a href="https://www.youtube.com/@madrasetnatv" target="_blank" rel="noopener" class="text-red-700 hover:text-red-800 font-semibold flex items-center gap-1.5" title="قناة مدرستنا التعليمية (وزارة التربية والتعليم)">
                <span class="h-2 w-2 rounded-full bg-red-600 inline-block animate-pulse"></span>
                قناة مدرستنا (Madrasetna TV)
              </a>
            </li>
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
          <div class="mt-4 flex flex-wrap gap-2.5">
            <!-- Madrasetna TV YouTube Channel -->
            <a href="https://www.youtube.com/@madrasetnatv"
              target="_blank" rel="noopener"
              aria-label="قناة مدرستنا التعليمية (Madrasetna TV)"
              title="قناة مدرستنا التعليمية (Madrasetna TV)"
              class="grid h-10 w-10 place-items-center rounded-full border border-red-200 bg-red-50 text-red-600 shadow-sm transition hover:scale-110 hover:border-red-400 hover:bg-red-100 ring-2 ring-red-400/20">
              <svg class="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>

            <!-- Facebook -->
            <a href="https://www.facebook.com/share/19VQQzp4Bx/?mibextid=wwXIfr"
              target="_blank" rel="noopener"
              aria-label="Facebook"
              title="Facebook"
              class="grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-blue-600 shadow-sm transition hover:scale-110 hover:border-blue-500 hover:bg-blue-50">
              <svg class="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>

            <!-- Instagram -->
            <a href="https://instagram.com/diamanti_egi"
              target="_blank" rel="noopener"
              aria-label="Instagram (diamanti_egi)"
              title="Instagram: diamanti_egi"
              class="grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-pink-600 shadow-sm transition hover:scale-110 hover:border-pink-500 hover:bg-pink-50">
              <svg class="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>

            <!-- YouTube Adel Mostafa -->
            <a href="https://youtube.com/@adelmostafa7859"
              target="_blank" rel="noopener"
              aria-label="YouTube (@adelmostafa7859)"
              title="YouTube: @adelmostafa7859"
              class="grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-red-600 shadow-sm transition hover:scale-110 hover:border-red-500 hover:bg-red-50">
              <svg class="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>

            <!-- WhatsApp Direct -->
            <a href="https://wa.me/201100764511"
              target="_blank" rel="noopener"
              aria-label="WhatsApp (01100764511)"
              title="WhatsApp: 01100764511"
              class="grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-emerald-600 shadow-sm transition hover:scale-110 hover:border-emerald-500 hover:bg-emerald-50">
              <svg class="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.28-2.42 5.83a8.19 8.19 0 0 1-5.82 2.41c-1.44 0-2.85-.38-4.09-1.11l-.29-.18-3.04.8 1.05-2.96-.19-.31c-.8-1.3-1.22-2.82-1.22-4.48 0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.25-1.5-1.4-1.75-.14-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.72 4.31 3.81.6.26 1.07.42 1.44.54.61.19 1.16.17 1.6.1.49-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.1-.23-.17-.48-.29z"/>
              </svg>
            </a>
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
}
