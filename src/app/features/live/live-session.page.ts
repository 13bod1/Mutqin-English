import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { switchMap } from 'rxjs';
import { AuthService } from '../../core/data/auth.service';
import { CommerceService } from '../../core/data/commerce.service';
import { LiveClassService } from '../../core/data/live-class.service';
import { LanguageService } from '../../core/i18n/language.service';
import { LocalizePipe, TranslatePipe } from '../../core/i18n/translate.pipe';
import { StatePanelComponent } from '../../shared/ui/state-panel.component';
import { ChatMode, LiveChatComponent } from './live-chat.component';

type View = 'locked' | 'scheduled' | 'live' | 'ended';

/** /live/:id — the student's live class page (scheduled · live · ended · no access). */
@Component({
  selector: 'app-live-session',
  imports: [RouterLink, LucideAngularModule, TranslatePipe, LocalizePipe, DatePipe, DecimalPipe, LiveChatComponent, StatePanelComponent],
  template: `
    <section class="container-page py-6 md:py-10">
      <nav class="flex flex-wrap items-center gap-2 text-sm text-ink-muted" [attr.aria-label]="'pay.breadcrumb' | t">
        <a routerLink="/live" class="hover:text-ink">{{ 'nav.live' | t }}</a>
        <lucide-icon name="chevron-right" [size]="14" class="flip-rtl" />
        <span class="line-clamp-1 font-medium text-ink">{{ session()?.title | loc }}</span>
      </nav>

      @if (session() === undefined) {
        <div class="mt-6 aspect-video animate-pulse rounded-card-lg bg-surface-tint3 lg:aspect-[21/9]"></div>
      } @else if (session() === null) {
        <app-state-panel class="mt-10" icon="circle-alert" [title]="'live.notFound.title' | t" [text]="'live.notFound.text' | t">
          <a actions routerLink="/live" class="btn btn-primary">{{ 'live.allSessions' | t }}</a>
        </app-state-panel>
      } @else {
        @let s = session()!;
        <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <!-- Player -->
          <div class="relative aspect-video overflow-hidden rounded-card-lg bg-gradient-to-br from-[#2B1D19] to-primary text-white shadow-card">
            @switch (view()) {
              @case ('scheduled') {
                <div class="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center sm:gap-4">
                  <span class="chip hide-mobile"><lucide-icon name="calendar" [size]="13" class="me-1.5" />{{ 'live.scheduled' | t }}</span>
                  <p class="font-display text-sm font-semibold text-white/80 sm:text-base">{{ 'live.startsIn' | t }}</p>
                  <div class="flex gap-2 sm:gap-3" role="timer" [attr.aria-label]="'live.startsIn' | t">
                    @for (u of countdown(); track u.k) {
                      <div class="w-16 rounded-card border border-white/20 bg-white/10 py-2 text-center sm:w-24 sm:py-3.5">
                        <p class="font-display text-2xl font-extrabold tabular-nums sm:text-4xl">{{ u.v }}</p>
                        <p class="font-display text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-white/70 sm:text-[0.6875rem]">{{ 'live.units.' + u.k | t }}</p>
                      </div>
                    }
                  </div>
                  <p class="text-xs text-white/75 sm:text-sm">{{ s.startsAt | date: 'EEEE, d MMM y · h:mm a' : 'Africa/Cairo' : i18n.lang() }} {{ 'live.cairo' | t }}</p>
                  <div class="flex gap-2 sm:gap-3">
                    <a class="btn btn-light btn-sm sm:btn" [href]="calendarUrl()" target="_blank" rel="noopener"><lucide-icon name="calendar-plus" [size]="16" />{{ 'live.addCalendar' | t }}</a>
                    <button type="button" class="btn btn-outline-light btn-sm sm:btn" [attr.aria-pressed]="remind()" (click)="remind.set(!remind())">
                      <lucide-icon [name]="remind() ? 'check' : 'bell'" [size]="16" />{{ (remind() ? 'live.reminderSet' : 'live.remindMe') | t }}
                    </button>
                  </div>
                </div>
              }
              @case ('live') {
                <!-- Mux player goes here (playbackUrl is only returned to students with access). -->
                <div class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-primary-mid to-[#2B1D19]">
                  <span class="grid h-16 w-16 place-items-center rounded-full bg-surface-highlight font-display text-xl font-bold text-primary sm:h-24 sm:w-24 sm:text-3xl">AM</span>
                  <p class="font-display text-sm font-semibold text-white/80">{{ 'live.presenting' | t }}</p>
                </div>
                <div class="absolute start-3 top-3 flex gap-2 sm:start-4 sm:top-4">
                  <span class="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1 font-display text-xs font-bold"><span class="h-2 w-2 animate-pulse rounded-full bg-white"></span>{{ 'live.liveBadge' | t }}</span>
                  <span class="inline-flex items-center gap-1.5 rounded-lg bg-black/55 px-2.5 py-1 font-display text-xs font-semibold"><lucide-icon name="eye" [size]="13" />{{ 'live.watching' | t: { n: s.viewers ?? 0 } }}</span>
                </div>
                <div class="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8 sm:px-5">
                  <div class="flex items-center gap-4">
                    <button type="button" [attr.aria-label]="'live.pause' | t"><lucide-icon name="pause" [size]="20" /></button>
                    <button type="button" [attr.aria-label]="'live.volume' | t"><lucide-icon name="volume-2" [size]="20" /></button>
                    <span class="font-display text-xs font-semibold" dir="ltr">● LIVE · {{ elapsed() }}</span>
                  </div>
                  <div class="flex items-center gap-4">
                    <span class="font-display text-xs font-semibold">720p</span>
                    <button type="button" [attr.aria-label]="'live.fullscreen' | t"><lucide-icon name="maximize" [size]="20" /></button>
                  </div>
                </div>
              }
              @case ('ended') {
                <div class="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center sm:gap-4">
                  <span class="grid h-12 w-12 place-items-center rounded-full bg-success-soft text-success sm:h-16 sm:w-16"><lucide-icon name="circle-check" [size]="28" /></span>
                  <p class="font-display text-xl font-bold sm:text-2xl">{{ 'live.ended.title' | t }}</p>
                  <p class="hide-mobile text-sm text-white/80">{{ 'live.ended.text' | t }}</p>
                  @if (s.stats; as st) {
                    <div class="hide-mobile flex gap-2 rounded-card-lg bg-white/10 px-2 py-3">
                      <div class="w-28 text-center"><p class="font-display text-xl font-bold">{{ st.durationMin }}m</p><p class="text-xs text-white/70">{{ 'live.ended.duration' | t }}</p></div>
                      <div class="w-28 text-center"><p class="font-display text-xl font-bold">{{ st.attended }}</p><p class="text-xs text-white/70">{{ 'live.ended.attended' | t }}</p></div>
                      <div class="w-28 text-center"><p class="font-display text-xl font-bold">{{ st.questions }}</p><p class="text-xs text-white/70">{{ 'live.ended.questions' | t }}</p></div>
                    </div>
                  }
                  <div class="flex gap-2 sm:gap-3">
                    <a routerLink="/lectures" class="btn btn-light btn-sm sm:btn"><lucide-icon name="circle-play" [size]="16" />{{ 'live.ended.replay' | t }}</a>
                    <a routerLink="/quizzes" class="btn btn-outline-light btn-sm sm:btn"><lucide-icon name="list-checks" [size]="16" />{{ 'live.ended.quiz' | t }}</a>
                  </div>
                </div>
              }
              @case ('locked') {
                <div class="absolute inset-0 flex flex-col items-center justify-center gap-2.5 p-4 text-center sm:gap-4">
                  <span class="grid h-12 w-12 place-items-center rounded-full border border-white/25 bg-white/10 sm:h-[72px] sm:w-[72px]"><lucide-icon name="lock" [size]="26" /></span>
                  <p class="font-display text-lg font-bold sm:text-2xl">{{ (auth.user() ? 'live.locked.title' : 'live.locked.guestTitle') | t }}</p>
                  <p class="hide-mobile max-w-md text-sm text-white/80">{{ 'live.locked.text' | t }}</p>
                  @if (s.access.type === 'paid') {
                    <p class="flex items-baseline gap-2"><span class="font-display text-2xl font-extrabold sm:text-3xl">{{ 'access.price' | t: { n: (s.access.priceEgp | number) ?? '' } }}</span><span class="text-xs text-white/70">{{ 'live.locked.once' | t }}</span></p>
                  }
                  <div class="flex flex-wrap justify-center gap-2 sm:gap-3">
                    @if (!auth.user()) {
                      <a routerLink="/login" class="btn btn-light btn-sm sm:btn">{{ 'nav.login' | t }}</a>
                      <a routerLink="/signup" class="btn btn-outline-light btn-sm sm:btn">{{ 'nav.signup' | t }}</a>
                    } @else {
                      <a [routerLink]="['/checkout', 'live', s.id]" class="btn btn-light btn-sm sm:btn"><lucide-icon name="credit-card" [size]="16" />{{ 'live.locked.payOnline' | t }}</a>
                      <a [routerLink]="['/checkout', 'live', s.id, 'manual']" class="btn btn-outline-light btn-sm sm:btn"><lucide-icon name="upload" [size]="16" />{{ 'live.locked.upload' | t }}</a>
                    }
                  </div>
                </div>
              }
            }
          </div>

          <app-live-chat class="h-[420px] lg:h-auto" [messages]="chat() ?? []" [mode]="chatMode()" [online]="s.viewers ?? 0"
            [opensAt]="(s.startsAt | date: 'h:mm a' : 'Africa/Cairo' : i18n.lang()) ?? ''" />
        </div>

        <!-- Info -->
        <div class="card mt-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-5 sm:p-6">
          <span class="icon-tile h-12 w-12"><lucide-icon name="graduation-cap" [size]="22" /></span>
          <div class="flex-1">
            <h1 class="font-display text-lg font-bold">{{ s.title | loc }}</h1>
            <p class="mt-1 text-sm text-ink-body">
              {{ 'common.teacher' | t }} · {{ 'stagesShort.' + s.stage | t }} · {{ s.startsAt | date: 'EEE d MMM y · h:mm a' : 'Africa/Cairo' : i18n.lang() }}
            </p>
            <p class="mt-2 text-sm leading-6 text-ink-body">{{ s.description | loc }}</p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            @switch (view()) {
              @case ('live') {
                <span class="tag tone-danger px-3 py-1 text-xs"><span class="h-2 w-2 rounded-full bg-red-600"></span>{{ 'live.liveNow' | t }}</span>
                <button type="button" class="btn btn-soft" [attr.aria-pressed]="hand()" (click)="hand.set(!hand())">
                  <lucide-icon name="hand" [size]="16" />{{ (hand() ? 'live.handRaised' : 'live.raiseHand') | t }}
                </button>
              }
              @case ('ended') {
                @if (s.replayUntil) { <span class="tag tone-brand px-3 py-1 text-xs"><lucide-icon name="clock" [size]="12" />{{ 'live.replayUntil' | t: { date: (s.replayUntil | date: 'd MMM y' : 'Africa/Cairo' : i18n.lang()) ?? '' } }}</span> }
              }
              @case ('locked') {
                <span class="tag tone-neutral px-3 py-1 text-xs"><lucide-icon name="lock" [size]="12" />{{ 'live.notEnrolled' | t }}</span>
                @if (auth.user() && s.access.type === 'paid') {
                  <a [routerLink]="['/checkout', 'live', s.id]" class="btn btn-primary"><lucide-icon name="ticket" [size]="16" />{{ 'live.enroll' | t: { n: s.access.priceEgp ?? 0 } }}</a>
                }
              }
              @default {
                <span class="tag tone-success px-3 py-1 text-xs"><lucide-icon name="badge-check" [size]="12" />{{ 'live.enrolled' | t }}</span>
              }
            }
            @if (view() !== 'locked') {
              <button type="button" class="btn btn-soft"><lucide-icon name="file-text" [size]="16" />{{ 'live.materials' | t }}</button>
            }
          </div>
        </div>
      }
    </section>
  `,
})
export class LiveSessionPage {
  readonly id = input.required<string>();

  protected readonly i18n = inject(LanguageService);
  protected readonly auth = inject(AuthService);
  private readonly live = inject(LiveClassService);
  private readonly commerce = inject(CommerceService);

  protected readonly session = toSignal(toObservable(this.id).pipe(switchMap((id) => this.live.getById(id))));
  protected readonly chat = toSignal(toObservable(this.id).pipe(switchMap((id) => this.live.getChat(id))));

  protected readonly remind = signal(false);
  protected readonly hand = signal(false);
  private readonly now = signal(Date.now());

  protected readonly view = computed<View>(() => {
    const s = this.session();
    if (!s) return 'locked';
    if (!this.commerce.canAccess(s.access, 'live', s.id)) return 'locked';
    return s.status;
  });

  protected readonly chatMode = computed<ChatMode>(() => {
    switch (this.view()) {
      case 'live': return 'open';
      case 'ended': return 'closed';
      case 'scheduled': return 'notStarted';
      default: return 'locked';
    }
  });

  protected readonly countdown = computed(() => {
    const s = this.session();
    const ms = Math.max(0, (s ? Date.parse(s.startsAt) : 0) - this.now());
    const t = Math.floor(ms / 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return [
      { k: 'days', v: pad(Math.floor(t / 86400)) },
      { k: 'hours', v: pad(Math.floor((t % 86400) / 3600)) },
      { k: 'min', v: pad(Math.floor((t % 3600) / 60)) },
      { k: 'sec', v: pad(t % 60) },
    ];
  });

  protected readonly elapsed = computed(() => {
    const s = this.session();
    const t = Math.max(0, Math.floor((this.now() - (s ? Date.parse(s.startsAt) : 0)) / 1000)) % 86400;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${Math.floor(t / 3600)}:${pad(Math.floor((t % 3600) / 60))}:${pad(t % 60)}`;
  });

  protected readonly calendarUrl = computed(() => {
    const s = this.session();
    if (!s) return '#';
    const start = new Date(s.startsAt);
    const end = new Date(start.getTime() + s.durationMin * 60000);
    const f = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const q = new URLSearchParams({ action: 'TEMPLATE', text: s.title.en, dates: `${f(start)}/${f(end)}`, details: 'Mr. Adel Mostafa — live session' });
    return `https://calendar.google.com/calendar/render?${q}`;
  });

  constructor() {
    const t = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(t));
  }
}
