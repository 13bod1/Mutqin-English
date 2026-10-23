import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AdminService } from '../../core/data/admin.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Announcement, AnnouncementState } from '../../core/models/admin';
import { AdminHeaderComponent } from './admin-ui';

type Filter = 'all' | 'scheduled' | 'draft';
const TONE: Record<AnnouncementState, string> = { scheduled: 'tone-gold', sent: 'tone-success', draft: 'tone-neutral' };

@Component({
  selector: 'app-admin-announcements',
  imports: [FormsModule, LucideAngularModule, TranslatePipe, DatePipe, AdminHeaderComponent],
  template: `
    <div class="space-y-6">
      <app-admin-header [title]="'admin.ann.title' | t" [subtitle]="'admin.ann.subtitle' | t" />

      <div class="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section class="card overflow-hidden p-0">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 px-5 py-4">
            <div class="seg" role="tablist">
              @for (f of filters; track f) {
                <button type="button" role="tab" [class.seg-on]="filter() === f" [attr.aria-selected]="filter() === f" (click)="filter.set(f)">{{ 'admin.ann.f.' + f | t: { n: count(f) } }}</button>
              }
            </div>
            <span class="text-[0.8125rem] text-ink-muted">{{ 'admin.ann.total' | t: { n: admin.announcements().length } }}</span>
          </div>
          <ul>
            @for (a of shown(); track a.id) {
              <li class="flex gap-3.5 border-b border-line/60 px-5 py-4 last:border-0">
                <span class="icon-tile" [class]="a.state === 'draft' ? 'tone-neutral' : a.state === 'scheduled' ? 'tone-gold' : ''"><lucide-icon [name]="a.icon" [size]="18" /></span>
                <div class="min-w-0 flex-1">
                  <p class="flex flex-wrap items-center gap-2">
                    <span class="font-display text-[0.9375rem] font-bold text-ink" dir="auto">{{ a.title }}</span>
                    <span class="tag" [class]="tone[a.state]">
                      @if (a.state === 'scheduled') { <lucide-icon name="clock" [size]="11" /> }
                      {{ 'admin.ann.state.' + a.state | t }}
                    </span>
                    @if (a.pinned) { <span class="tag tone-brand"><lucide-icon name="pin" [size]="11" />{{ 'live.chat.pinned' | t }}</span> }
                  </p>
                  <p class="mt-1 text-[0.8125rem] leading-5 text-ink-body" dir="auto">{{ a.body }}</p>
                  <p class="mt-1.5 text-xs text-ink-muted">
                    {{ a.at | date: 'd MMM, h:mm a' : 'Africa/Cairo' : i18n.lang() }} · {{ 'admin.ann.aud.' + a.audience | t }}
                    @if (a.seen !== undefined) { · {{ 'admin.ann.seen' | t: { n: a.seen, total: a.reach ?? 0, pct: pct(a) } }} }
                  </p>
                </div>
                <button type="button" class="btn-icon text-danger hover:bg-red-50" (click)="admin.deleteAnnouncement(a.id)" title="Delete announcement"><lucide-icon name="trash-2" [size]="16" /></button>
              </li>
            } @empty {
              <li class="px-5 py-12 text-center text-ink-muted">{{ 'admin.noResults' | t }}</li>
            }
          </ul>
        </section>

        <form class="card space-y-5 p-5 shadow-lift sm:p-6" (ngSubmit)="publish()">
          <h2 class="font-display text-lg font-bold">{{ 'admin.ann.new' | t }}</h2>
          <label class="block">
            <span class="field-label">{{ 'admin.ann.titleLabel' | t }}</span>
            <input class="input input-plain" name="title" dir="auto" maxlength="80" [ngModel]="title()" (ngModelChange)="title.set($event)" [class.input-invalid]="tried() && !title().trim()" />
          </label>
          <label class="block">
            <span class="field-label">{{ 'admin.ann.message' | t }}</span>
            <textarea class="input input-plain h-auto py-3 leading-6" rows="4" name="body" dir="auto" maxlength="500" [ngModel]="body()" (ngModelChange)="body.set($event)" [class.input-invalid]="tried() && !body().trim()"></textarea>
            <span class="mt-1 block text-end text-xs text-ink-muted">{{ body().length }} / 500</span>
          </label>
          <fieldset>
            <legend class="field-label">{{ 'admin.ann.audience' | t }}</legend>
            <div class="flex flex-wrap gap-2">
              @for (a of audiences; track a.key) {
                <button type="button" class="pill" [class]="audience() === a.key ? '!border-primary !bg-primary !text-white' : 'bg-white'" [attr.aria-pressed]="audience() === a.key" (click)="audience.set(a.key)">
                  @if (audience() === a.key) { <lucide-icon name="check" [size]="13" /> }
                  {{ 'admin.ann.aud.' + a.key | t }} · {{ a.n }}
                </button>
              }
            </div>
          </fieldset>
          <fieldset>
            <legend class="field-label">{{ 'admin.ann.sendVia' | t }}</legend>
            <div class="flex flex-wrap gap-5 text-sm text-ink">
              <label class="flex items-center gap-2"><input type="checkbox" class="h-[18px] w-[18px] accent-primary" name="inApp" [ngModel]="inApp()" (ngModelChange)="inApp.set($event)" />{{ 'admin.ann.inApp' | t }}</label>
              <label class="flex items-center gap-2"><input type="checkbox" class="h-[18px] w-[18px] accent-primary" name="email" [ngModel]="email()" (ngModelChange)="email.set($event)" />{{ 'admin.ann.email' | t }}</label>
              <label class="flex items-center gap-2"><input type="checkbox" class="h-[18px] w-[18px] accent-primary" name="pin" [ngModel]="pin()" (ngModelChange)="pin.set($event)" />{{ 'admin.ann.pin' | t }}</label>
            </div>
          </fieldset>
          <div class="flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-5">
            <label class="flex items-center gap-2.5 text-sm text-ink">
              <button type="button" role="switch" class="switch" [attr.aria-checked]="schedule()" (click)="schedule.set(!schedule())"></button>{{ 'admin.ann.schedule' | t }}
            </label>
            @if (schedule()) {
              <input type="datetime-local" name="when" class="input input-plain h-10 w-auto text-sm" [ngModel]="when()" (ngModelChange)="when.set($event)" [attr.aria-label]="'admin.ann.schedule' | t" />
            }
          </div>
          <div class="flex gap-3 [&>*]:flex-1">
            <button type="button" class="btn btn-soft" (click)="save('draft')">{{ 'admin.ann.saveDraft' | t }}</button>
            <button type="submit" class="btn btn-primary"><lucide-icon name="send" [size]="16" class="flip-rtl" />{{ (schedule() ? 'admin.ann.scheduleBtn' : 'admin.ann.sendNow') | t }}</button>
          </div>
          @if (done()) { <p class="note tone-success" role="status"><lucide-icon name="circle-check" [size]="16" class="shrink-0" />{{ done()! | t }}</p> }
        </form>
      </div>
    </div>
  `,
})
export class AdminAnnouncementsPage {
  protected readonly admin = inject(AdminService);
  protected readonly i18n = inject(LanguageService);
  protected readonly tone = TONE;
  protected readonly filters: Filter[] = ['all', 'scheduled', 'draft'];
  protected readonly audiences = [
    { key: 'all', n: 347 }, { key: 'sec3', n: 214 }, { key: 'sec2', n: 71 }, { key: 'sec1', n: 44 }, { key: 'prep', n: 18 },
  ];

  protected readonly filter = signal<Filter>('all');
  protected readonly title = signal('');
  protected readonly body = signal('');
  protected readonly audience = signal('sec3');
  protected readonly inApp = signal(true);
  protected readonly email = signal(true);
  protected readonly pin = signal(false);
  protected readonly schedule = signal(false);
  protected readonly when = signal('2026-10-31T10:00');
  protected readonly tried = signal(false);
  protected readonly done = signal<string | null>(null);

  protected readonly shown = computed(() => this.admin.announcements().filter((a) => this.filter() === 'all' || a.state === this.filter()));

  protected count(f: Filter): number {
    return f === 'all' ? this.admin.announcements().length : this.admin.announcements().filter((a) => a.state === f).length;
  }

  protected pct(a: Announcement): number {
    return a.reach ? Math.round(((a.seen ?? 0) / a.reach) * 100) : 0;
  }

  protected publish(): void {
    this.save(this.schedule() ? 'scheduled' : 'sent');
  }

  protected save(state: AnnouncementState): void {
    this.tried.set(true);
    if (!this.title().trim() || (state !== 'draft' && !this.body().trim())) return;
    const channels = [...(this.inApp() ? ['inApp' as const] : []), ...(this.email() ? ['email' as const] : [])];
    this.admin.publish({
      id: 'a' + Date.now(),
      icon: state === 'draft' ? 'square-pen' : this.pin() ? 'pin' : 'megaphone',
      title: this.title().trim(),
      body: this.body().trim(),
      audience: this.audience(),
      channels,
      state,
      pinned: this.pin(),
      at: state === 'scheduled' ? new Date(this.when() + ':00+02:00').toISOString() : new Date().toISOString(),
      ...(state === 'sent' ? { seen: 0, reach: this.audiences.find((a) => a.key === this.audience())?.n ?? 0 } : {}),
    });
    this.title.set('');
    this.body.set('');
    this.tried.set(false);
    this.done.set(`admin.ann.done.${state}`);
    setTimeout(() => this.done.set(null), 3000);
  }
}
