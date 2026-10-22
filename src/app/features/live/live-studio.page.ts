import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { switchMap } from 'rxjs';
import { LiveClassService } from '../../core/data/live-class.service';
import { LanguageService } from '../../core/i18n/language.service';
import { LocalizePipe, TranslatePipe } from '../../core/i18n/translate.pipe';
import { LiveStatus } from '../../core/models/live';
import { StatePanelComponent } from '../../shared/ui/state-panel.component';
import { LiveChatComponent } from './live-chat.component';

/** /live/:id/studio — teacher view: stream setup, go live / end, stats and chat moderation. */
@Component({
  selector: 'app-live-studio',
  imports: [RouterLink, LucideAngularModule, TranslatePipe, LocalizePipe, DatePipe, LiveChatComponent, StatePanelComponent],
  template: `
    <section class="container-page py-6 md:py-10">
      <nav class="flex flex-wrap items-center gap-2 text-sm text-ink-muted" [attr.aria-label]="'pay.breadcrumb' | t">
        <a routerLink="/admin/live" class="hover:text-ink">{{ 'nav.live' | t }}</a>
        <lucide-icon name="chevron-right" [size]="14" class="flip-rtl" />
        <span class="font-medium text-ink">{{ 'studio.crumb' | t }}</span>
      </nav>

      @if (session() === null) {
        <app-state-panel class="mt-10" icon="circle-alert" [title]="'live.notFound.title' | t" [text]="'live.notFound.text' | t">
          <a actions routerLink="/admin/live" class="btn btn-primary">{{ 'live.allSessions' | t }}</a>
        </app-state-panel>
      } @else if (session(); as s) {
        <header class="mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p class="eyebrow">{{ 'studio.eyebrow' | t }}</p>
            <h1 class="mt-2 font-display text-[1.75rem] font-bold leading-9 md:text-[2rem]">{{ 'studio.title' | t }}</h1>
            <p class="mt-1 text-ink-body">{{ s.title | loc }} · {{ s.startsAt | date: 'EEE d MMM y · h:mm a' : 'Africa/Cairo' : i18n.lang() }}</p>
          </div>
          <div class="flex flex-wrap gap-3">
            @switch (status()) {
              @case ('live') {
                <button type="button" class="btn btn-soft" (click)="paused.set(!paused())">
                  <lucide-icon [name]="paused() ? 'play' : 'circle-pause'" [size]="16" />{{ (paused() ? 'studio.resume' : 'studio.pause') | t }}
                </button>
                <button type="button" class="btn btn-danger" (click)="status.set('ended')"><lucide-icon name="circle-x" [size]="16" />{{ 'studio.end' | t }}</button>
              }
              @case ('scheduled') {
                <button type="button" class="btn btn-live" [disabled]="!connected()" (click)="status.set('live')"><lucide-icon name="radio" [size]="16" />{{ 'studio.goLive' | t }}</button>
              }
              @case ('ended') {
                <span class="tag tone-neutral px-3 py-1.5 text-xs">{{ 'studio.endedTag' | t }}</span>
              }
            }
          </div>
        </header>

        <!-- Stats -->
        <div class="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          @for (st of stats(); track st.label) {
            <div class="stat-card">
              <div class="flex items-center justify-between gap-2"><span class="stat-label">{{ st.label | t }}</span><span class="icon-tile h-9 w-9" [class]="st.tone"><lucide-icon [name]="st.icon" [size]="17" /></span></div>
              <p class="stat-value">{{ st.value }}</p>
              <p class="text-xs text-ink-muted" [class.!text-amber]="st.warn">{{ st.note | t: st.params }}</p>
            </div>
          }
        </div>

        <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div class="space-y-6">
            <!-- Preview -->
            <div class="relative aspect-video overflow-hidden rounded-card-lg bg-gradient-to-b from-primary-mid to-[#2B1D19] text-white shadow-card">
              <div class="absolute inset-0 flex flex-col items-center justify-center gap-3">
                @if (connected()) {
                  <span class="grid h-20 w-20 place-items-center rounded-full bg-surface-highlight font-display text-2xl font-bold text-primary">AM</span>
                  <p class="font-display text-sm font-semibold text-white/80">{{ 'studio.preview' | t }}</p>
                } @else {
                  <span class="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white"></span>
                  <p class="font-display text-sm font-semibold text-white/80">{{ 'studio.waiting' | t }}</p>
                }
              </div>
              <div class="absolute start-4 top-4 flex flex-wrap gap-2">
                @if (status() === 'live') {
                  <span class="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1 font-display text-xs font-bold"><span class="h-2 w-2 rounded-full bg-white"></span>{{ 'live.liveBadge' | t }}{{ paused() ? ' · ' + ('studio.paused' | t) : '' }}</span>
                }
                @if (connected()) {
                  <span class="inline-flex items-center gap-1.5 rounded-lg bg-black/55 px-2.5 py-1 font-display text-xs font-semibold"><lucide-icon name="signal" [size]="13" />{{ 'studio.health' | t }}</span>
                }
              </div>
            </div>

            <!-- Stream setup -->
            <div class="card space-y-5 p-5 sm:p-6">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <h2 class="flex items-center gap-2.5 font-display text-base font-bold"><span class="icon-tile h-9 w-9"><lucide-icon name="radio" [size]="17" /></span>{{ 'studio.setup' | t }}</h2>
                <span class="tag tone-warning"><lucide-icon name="circle-alert" [size]="12" />{{ 'studio.muxMissing' | t }}</span>
              </div>
              <div class="grid gap-4 md:grid-cols-2">
                <div>
                  <p class="field-label">{{ 'studio.server' | t }}</p>
                  <div class="flex gap-2">
                    <code class="flex h-11 min-w-0 flex-1 items-center truncate rounded-card border border-line bg-surface-page px-3.5 text-sm text-ink" dir="ltr">rtmps://global-live.mux.com/app</code>
                    <button type="button" class="btn-icon h-11 w-11" (click)="copy('rtmps://global-live.mux.com:443/app')" [attr.aria-label]="'pay.manual.copy' | t"><lucide-icon name="copy" [size]="16" /></button>
                  </div>
                </div>
                <div>
                  <p class="field-label">{{ 'studio.key' | t }}</p>
                  <div class="flex gap-2">
                    <code class="flex h-11 min-w-0 flex-1 items-center truncate rounded-card border border-line bg-surface-page px-3.5 text-sm text-ink" dir="ltr">{{ showKey() ? 'live_8f3c2a91-demo-key' : '••••••••••••••••••••' }}</code>
                    <button type="button" class="btn-icon h-11 w-11" (click)="showKey.set(!showKey())" [attr.aria-label]="'studio.showKey' | t"><lucide-icon [name]="showKey() ? 'eye-off' : 'eye'" [size]="16" /></button>
                    <button type="button" class="btn-icon h-11 w-11" (click)="copy('live_8f3c2a91-demo-key')" [attr.aria-label]="'pay.manual.copy' | t"><lucide-icon name="copy" [size]="16" /></button>
                  </div>
                </div>
              </div>
              <div class="flex items-center justify-between gap-3 text-xs text-ink-muted">
                <span>{{ 'studio.keyWarn' | t }}</span>
                <button type="button" class="btn btn-ghost btn-sm"><lucide-icon name="rotate-ccw" [size]="14" />{{ 'studio.resetKey' | t }}</button>
              </div>
              <div class="flex flex-wrap gap-x-8 gap-y-4 border-t border-line/70 pt-5">
                @for (tg of toggles(); track tg.key) {
                  <label class="flex items-center gap-2.5 text-sm text-ink">
                    <button type="button" role="switch" class="switch" [attr.aria-checked]="tg.on" (click)="flip(tg.key)"><span class="sr-only">{{ tg.key | t }}</span></button>
                    {{ tg.key | t }}
                  </label>
                }
              </div>
              @if (status() === 'scheduled') {
                <div class="note tone-brand items-center">
                  <lucide-icon name="video" [size]="18" class="shrink-0" />
                  <span class="flex-1">{{ 'studio.beforeLive' | t: { n: s.seatsTaken } }}</span>
                  <button type="button" class="btn btn-soft btn-sm" (click)="connected.set(!connected())">{{ (connected() ? 'studio.disconnect' : 'studio.simulate') | t }}</button>
                </div>
              }
            </div>
          </div>

          <app-live-chat class="h-[560px] lg:h-auto lg:max-h-[860px]" [messages]="chat() ?? []" [moderator]="true"
            [mode]="status() === 'live' && chatOn() ? 'open' : status() === 'ended' ? 'closed' : 'notStarted'" [online]="s.viewers ?? 0"
            [opensAt]="(s.startsAt | date: 'h:mm a' : 'Africa/Cairo' : i18n.lang()) ?? ''" />
        </div>
      }
    </section>
  `,
})
export class LiveStudioPage {
  readonly id = input.required<string>();

  protected readonly i18n = inject(LanguageService);
  private readonly live = inject(LiveClassService);

  protected readonly session = toSignal(toObservable(this.id).pipe(switchMap((id) => this.live.getById(id))));
  protected readonly chat = toSignal(toObservable(this.id).pipe(switchMap((id) => this.live.getChat(id))));

  protected readonly status = linkedSignal<LiveStatus>(() => this.session()?.status ?? 'scheduled');
  protected readonly connected = linkedSignal(() => this.session()?.status === 'live');
  protected readonly paused = signal(false);
  protected readonly showKey = signal(false);
  protected readonly chatOn = signal(true);
  private readonly record = signal(true);
  private readonly slow = signal(false);

  protected readonly toggles = computed(() => [
    { key: 'studio.chatEnabled', on: this.chatOn() },
    { key: 'studio.record', on: this.record() },
    { key: 'studio.slow', on: this.slow() },
  ]);

  protected readonly stats = computed(() => {
    const s = this.session();
    const live = this.status() === 'live';
    return [
      { label: 'studio.stats.watching', icon: 'users', tone: '', value: live ? String(s?.viewers ?? 0) : '0', note: 'studio.stats.ofSeats', params: { n: s?.maxSeats ?? 400 } },
      { label: 'studio.stats.enrolled', icon: 'ticket', tone: '', value: String(s?.seatsTaken ?? 0), note: 'studio.stats.seatsLeft', params: { n: (s?.maxSeats ?? 400) - (s?.seatsTaken ?? 0) } },
      { label: 'studio.stats.questions', icon: 'message-square', tone: '', value: live ? '146' : '0', note: 'studio.stats.unanswered', params: { n: live ? 23 : 0 }, warn: live },
      { label: 'studio.stats.hands', icon: 'hand', tone: 'tone-gold', value: live ? '4' : '0', note: 'studio.stats.invite', params: {} as Record<string, number> },
    ];
  });

  protected flip(key: string): void {
    if (key === 'studio.chatEnabled') this.chatOn.update((v) => !v);
    if (key === 'studio.record') this.record.update((v) => !v);
    if (key === 'studio.slow') this.slow.update((v) => !v);
  }

  protected copy(v: string): void {
    navigator.clipboard?.writeText(v).catch(() => {});
  }
}
