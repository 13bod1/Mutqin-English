import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { CommerceService } from '../../core/data/commerce.service';
import { LiveClassService } from '../../core/data/live-class.service';
import { LanguageService } from '../../core/i18n/language.service';
import { LocalizePipe, TranslatePipe } from '../../core/i18n/translate.pipe';
import { LiveClass } from '../../core/models/live';
import { SectionHeaderComponent } from '../../shared/ui/section-header.component';

/** /live — upcoming, live-now and past live classes. */
@Component({
  selector: 'app-live-list',
  imports: [RouterLink, LucideAngularModule, TranslatePipe, LocalizePipe, DatePipe, SectionHeaderComponent],
  template: `
    <section class="bg-gradient-to-b from-surface-warm to-surface-page">
      <div class="container-page py-12 md:py-16">
        <app-section-header [eyebrow]="'live.list.eyebrow' | t" [title]="'live.list.title' | t" [subtitle]="'live.list.subtitle' | t" />

        @if (sessions(); as list) {
          <div class="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            @for (s of list; track s.id) {
              <article class="card flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift">
                <div class="relative flex aspect-[16/8] items-center justify-center overflow-hidden bg-gradient-to-br from-primary to-[#2B1D19] text-white group">
                  @if (s.thumbnail) {
                    <img [src]="s.thumbnail" [alt]="s.title | loc" class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/20"></div>
                  } @else {
                    <lucide-icon name="radio" [size]="36" class="opacity-80" />
                  }
                  <span class="absolute start-3 top-3 z-10 rounded-md bg-white/95 px-2.5 py-1 font-display text-[0.6875rem] font-semibold text-ink shadow-sm">{{ 'stagesShort.' + s.stage | t }}</span>
                  <span class="tag absolute end-3 top-3 z-10 shadow-sm" [class]="statusClass(s)">
                    @if (s.status === 'live') { <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-white"></span> }
                    {{ 'live.status.' + s.status | t }}
                  </span>
                  @if (s.status === 'live') {
                    <span class="absolute bottom-3 start-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-red-600/90 px-2.5 py-0.5 text-[0.6875rem] font-bold text-white backdrop-blur">
                      <span class="h-1.5 w-1.5 rounded-full bg-white animate-ping"></span>
                      {{ 'live.status.live' | t }}
                    </span>
                  }
                </div>
                <div class="flex flex-1 flex-col p-5">
                  <p class="flex items-center gap-1.5 font-display text-xs font-semibold text-ink-soft">
                    <lucide-icon name="calendar" [size]="13" class="text-primary" />
                    {{ s.startsAt | date: 'EEE d MMM · h:mm a' : 'Africa/Cairo' : i18n.lang() }}
                  </p>
                  <h2 class="mt-2 font-display text-base font-bold leading-6 text-ink">{{ s.title | loc }}</h2>
                  <p class="mt-2 line-clamp-2 flex-1 text-sm leading-6 text-ink-body">{{ s.description | loc }}</p>
                  <div class="mt-4 border-t border-line/70 pt-3">
                    <div class="flex items-center justify-between text-xs text-ink-muted">
                      <span>{{ 'live.seats' | t: { n: s.seatsTaken, max: s.maxSeats } }}</span>
                      <span class="font-display font-bold text-ink">{{ priceLabel(s) }}</span>
                    </div>
                    <div class="progress-track mt-2 h-1.5"><div class="progress-fill" [style.width.%]="(s.seatsTaken / s.maxSeats) * 100"></div></div>
                  </div>
                  <a [routerLink]="['/live', s.id]" class="btn mt-4 w-full" [class]="s.status === 'live' ? 'btn-live' : 'btn-primary'">
                    {{ (s.status === 'live' ? 'live.joinNow' : s.status === 'ended' ? 'live.viewReplay' : 'live.viewSession') | t }}
                    <lucide-icon name="arrow-right" [size]="16" class="flip-rtl" />
                  </a>
                </div>
              </article>
            }
          </div>
        } @else {
          <div class="mt-10 grid gap-5 md:grid-cols-3">
            @for (i of [1, 2, 3]; track i) { <div class="h-96 animate-pulse rounded-card-lg bg-surface-tint3"></div> }
          </div>
        }
      </div>
    </section>
  `,
})
export class LiveListPage {
  protected readonly i18n = inject(LanguageService);
  private readonly commerce = inject(CommerceService);
  private readonly all = toSignal(inject(LiveClassService).getAll());

  private readonly order = { live: 0, scheduled: 1, ended: 2 } as const;
  protected readonly sessions = computed(() =>
    this.all()?.slice().sort((a, b) => this.order[a.status] - this.order[b.status] || a.startsAt.localeCompare(b.startsAt)),
  );

  protected statusClass(s: LiveClass): string {
    if (s.status === 'live') return 'bg-red-600 text-white';
    if (s.status === 'ended') return 'bg-white/90 text-ink-muted';
    return 'bg-gold-soft text-gold-dark';
  }

  protected priceLabel(s: LiveClass): string {
    if (this.commerce.owns('live', s.id)) return this.i18n.t('live.enrolled');
    if (s.access.type === 'paid') return this.i18n.t('access.price', { n: s.access.priceEgp ?? 0 });
    return this.i18n.t(s.access.type === 'free' ? 'access.free' : 'access.included');
  }
}
