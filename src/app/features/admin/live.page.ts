import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AdminService } from '../../core/data/admin.service';
import { LanguageService } from '../../core/i18n/language.service';
import { LocalizePipe, TranslatePipe } from '../../core/i18n/translate.pipe';
import { AcademicStage } from '../../core/models/lecture';
import { LiveClass, LiveStatus } from '../../core/models/live';
import { AccessEditorComponent } from './access-editor.component';
import { accessLabel, accessTone } from './access-label';
import { AdminHeaderComponent, DrawerComponent, StatComponent } from './admin-ui';

type Tab = 'upcoming' | 'past';

@Component({
  selector: 'app-admin-live',
  imports: [FormsModule, RouterLink, LucideAngularModule, TranslatePipe, LocalizePipe, DatePipe, DecimalPipe, AdminHeaderComponent, StatComponent, DrawerComponent, AccessEditorComponent],
  template: `
    <div class="space-y-6">
      <app-admin-header [title]="'admin.live.title' | t" [subtitle]="'admin.live.subtitle' | t">
        <button type="button" class="btn btn-primary" (click)="create()"><lucide-icon name="calendar-plus" [size]="16" />{{ 'admin.live.schedule' | t }}</button>
      </app-admin-header>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <app-stat [label]="'admin.live.upcoming' | t" [value]="upcoming().length + ''" icon="calendar" [note]="nextNote()" />
        <app-stat [label]="'admin.live.seatsSold' | t" [value]="(seats() | number) ?? ''" icon="users" [note]="'admin.live.acrossSessions' | t: { n: upcoming().length }" />
        <app-stat [label]="'admin.live.revenue' | t" [value]="'access.price' | t: { n: (revenue() | number) ?? '' }" icon="banknote" [note]="'admin.live.inclPending' | t" />
        <app-stat [label]="'admin.live.streaming' | t" [value]="'admin.live.muxNotSet' | t" icon="video" tone="tone-warning" valueClass="!text-amber !text-2xl" [note]="'admin.live.connectInSettings' | t" />
      </div>

      <div class="seg" role="tablist">
        <button type="button" role="tab" [class.seg-on]="tab() === 'upcoming'" [attr.aria-selected]="tab() === 'upcoming'" (click)="tab.set('upcoming')">{{ 'admin.live.tabUpcoming' | t: { n: upcoming().length } }}</button>
        <button type="button" role="tab" [class.seg-on]="tab() === 'past'" [attr.aria-selected]="tab() === 'past'" (click)="tab.set('past')">{{ 'admin.live.tabPast' | t: { n: past().length } }}</button>
      </div>

      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr><th>{{ 'admin.cols.session' | t }}</th><th>{{ 'admin.cols.date' | t }}</th><th>{{ 'admin.cols.access' | t }}</th><th>{{ 'admin.cols.enrolled' | t }}</th><th>{{ 'admin.cols.status' | t }}</th><th><span class="sr-only">{{ 'admin.cols.actions' | t }}</span></th></tr>
          </thead>
          <tbody>
            @for (s of (tab() === 'upcoming' ? upcoming() : past()); track s.id) {
              <tr>
                <td>
                  <div class="flex items-center gap-3">
                    <span class="icon-tile" [class]="s.status === 'ended' ? 'tone-neutral' : 'bg-surface-highlight/70'"><lucide-icon name="radio" [size]="18" /></span>
                    <div><p class="font-display font-semibold text-ink">{{ s.title | loc }}</p><p class="text-xs text-ink-muted">{{ 'stagesShort.' + s.stage | t }} · {{ 'common.minutes' | t: { n: s.durationMin } }}</p></div>
                  </div>
                </td>
                <td class="whitespace-nowrap">{{ s.startsAt | date: 'EEE d MMM · h:mm a' : 'Africa/Cairo' : i18n.lang() }}</td>
                <td><span class="tag whitespace-nowrap" [class]="tone(s)">{{ label(s) }}</span></td>
                <td>
                  <p class="font-display text-[0.8125rem] font-semibold text-ink" dir="ltr">{{ s.seatsTaken }} / {{ s.maxSeats }}</p>
                  <div class="progress-track mt-1.5 h-1.5 w-28"><div class="progress-fill" [style.width.%]="(s.seatsTaken / s.maxSeats) * 100"></div></div>
                </td>
                <td><span class="tag" [class]="statusTone[s.status]">{{ 'live.status.' + s.status | t }}</span></td>
                <td>
                  <div class="flex justify-end gap-2">
                    @if (s.status !== 'ended') {
                      <a [routerLink]="['/live', s.id, 'studio']" class="btn btn-sm" [class]="s.status === 'live' ? 'btn-live' : 'btn-primary'"><lucide-icon name="video" [size]="14" />{{ 'admin.live.studio' | t }}</a>
                    } @else {
                      <a [routerLink]="['/live', s.id]" class="btn btn-soft btn-sm"><lucide-icon name="circle-play" [size]="14" />{{ 'admin.live.replay' | t }}</a>
                    }
                    <button type="button" class="btn-icon" (click)="edit(s)" [attr.aria-label]="'admin.edit' | t"><lucide-icon name="pencil" [size]="14" /></button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="py-10 text-center text-ink-muted">{{ 'admin.noResults' | t }}</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    @if (draft(); as d) {
      <app-drawer [title]="(isNew() ? 'admin.live.schedule' : 'admin.live.edit') | t" [subtitle]="'admin.live.drawerSub' | t" (closed)="draft.set(null)">
        <label class="block"><span class="field-label">{{ 'admin.lectures.titleEn' | t }}</span>
          <input class="input input-plain" dir="ltr" [ngModel]="d.title.en" (ngModelChange)="patch({ title: { en: $event, ar: d.title.ar } })" /></label>
        <label class="block"><span class="field-label">{{ 'admin.lectures.titleAr' | t }}</span>
          <input class="input input-plain" dir="rtl" lang="ar" [ngModel]="d.title.ar" (ngModelChange)="patch({ title: { en: d.title.en, ar: $event } })" /></label>
        <div class="grid grid-cols-2 gap-4">
          <label class="block col-span-2">
            <span class="field-label">{{ 'admin.live.startsAt' | t }}</span>
            <input type="datetime-local" class="input input-plain text-sm" [ngModel]="local(d.startsAt)" (ngModelChange)="patch({ startsAt: iso($event) })" />
            @if (!startInFuture()) {
              <span class="mt-1 flex items-center gap-1 text-xs font-semibold text-danger"><lucide-icon name="triangle-alert" [size]="13" />Start time must be in the future.</span>
            }
          </label>
          <label class="block"><span class="field-label">{{ 'admin.live.duration' | t }}</span>
            <input type="number" min="15" step="15" class="input input-plain" [ngModel]="d.durationMin" (ngModelChange)="patch({ durationMin: +$event })" /></label>
          <label class="block"><span class="field-label">{{ 'admin.cols.stage' | t }}</span>
            <select class="input input-plain" [ngModel]="d.stage" (ngModelChange)="patch({ stage: $event })">
              @for (st of stages; track st) { <option [value]="st">{{ 'stagesShort.' + st | t }}</option> }
            </select></label>
          <label class="block"><span class="field-label">{{ 'admin.live.maxSeats' | t }}</span>
            <input type="number" min="1" max="400" class="input input-plain" [ngModel]="d.maxSeats" (ngModelChange)="patch({ maxSeats: +$event })" /></label>
        </div>
        <label class="block">
          <span class="field-label">{{ 'admin.live.streamUrl' | t }}</span>
          <input type="url" class="input input-plain [unicode-bidi:plaintext]" dir="ltr" placeholder="https://www.youtube.com/embed/…"
            [ngModel]="d.playbackUrl ?? ''" (ngModelChange)="patch({ playbackUrl: $event || undefined })" />
          @if (d.playbackUrl && !urlValid()) {
            <span class="mt-1 flex items-center gap-1 text-xs font-semibold text-danger"><lucide-icon name="triangle-alert" [size]="13" />Enter a valid URL (https://…).</span>
          }
          <span class="mt-1 block text-xs text-ink-muted">Optional. Only shown to enrolled students while the session is live.</span>
        </label>
        <app-access-editor [value]="d.access" (valueChange)="patch({ access: $event })" [defaultPrice]="350" />
        <button footer type="button" class="btn btn-soft" (click)="draft.set(null)">{{ 'admin.cancel' | t }}</button>
        <button footer type="button" class="btn btn-primary" [disabled]="!valid()" (click)="save()">{{ 'admin.save' | t }}</button>
      </app-drawer>
    }
  `,
})
export class AdminLivePage {
  protected readonly admin = inject(AdminService);
  protected readonly i18n = inject(LanguageService);
  protected readonly stages: AcademicStage[] = ['prep', 'sec1', 'sec2', 'sec3', 'university'];
  protected readonly statusTone: Record<LiveStatus, string> = { live: 'tone-danger', scheduled: 'tone-gold', ended: 'tone-neutral' };

  protected readonly tab = signal<Tab>('upcoming');
  protected readonly draft = signal<LiveClass | null>(null);
  protected readonly isNew = signal(false);

  protected readonly upcoming = computed(() => this.admin.liveClasses().filter((s) => s.status !== 'ended').sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
  protected readonly past = computed(() => this.admin.liveClasses().filter((s) => s.status === 'ended'));
  protected readonly seats = computed(() => this.upcoming().reduce((n, s) => n + s.seatsTaken, 0));
  protected readonly revenue = computed(() => this.upcoming().reduce((n, s) => n + (s.access.type === 'paid' ? s.seatsTaken * (s.access.priceEgp ?? 0) : 0), 0));
  protected readonly nextNote = computed(() => {
    const n = this.upcoming().find((s) => s.status === 'scheduled');
    if (!n) return '';
    const d = new Date(n.startsAt).toLocaleDateString(this.i18n.lang() === 'ar' ? 'ar-EG' : 'en-GB', { timeZone: 'Africa/Cairo', weekday: 'short', day: 'numeric', month: 'short' });
    return this.i18n.t('admin.live.next', { date: d });
  });
  protected readonly valid = computed(() => {
    const d = this.draft();
    if (!d) return false;
    const titleOk = !!d.title.en.trim();
    const seatsOk = d.maxSeats > 0;
    const pricedOk = d.access.type !== 'paid' || (d.access.priceEgp ?? 0) > 0;
    return titleOk && seatsOk && pricedOk && this.startInFuture() && this.urlValid();
  });

  /** True when the draft start time is in the future (new sessions only). */
  protected readonly startInFuture = computed(() => {
    const d = this.draft();
    if (!d) return true;
    // Skip check for existing live/ended sessions (already started)
    if (!this.isNew() && (d.status === 'live' || d.status === 'ended')) return true;
    return new Date(d.startsAt) > new Date();
  });

  /** True if no URL is set, or if the URL is a valid https:// URL. */
  protected readonly urlValid = computed(() => {
    const url = this.draft()?.playbackUrl;
    if (!url) return true;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:';
    } catch {
      return false;
    }
  });

  protected label(s: LiveClass): string {
    return accessLabel(this.i18n, s.access);
  }

  protected tone(s: LiveClass): string {
    return accessTone(s.access);
  }

  protected create(): void {
    this.isNew.set(true);
    this.draft.set({
      id: 'live-' + Date.now(), title: { en: '', ar: '' }, description: { en: '', ar: '' }, stage: 'sec3',
      startsAt: '2026-11-19T17:00:00Z', durationMin: 120, status: 'scheduled', access: { type: 'paid', priceEgp: 350 }, seatsTaken: 0, maxSeats: 400,
    });
  }

  protected edit(s: LiveClass): void {
    this.isNew.set(false);
    this.draft.set(structuredClone(s));
  }

  protected patch(p: Partial<LiveClass>): void {
    this.draft.update((d) => (d ? { ...d, ...p } : d));
  }

  protected save(): void {
    const d = this.draft();
    if (!d || !this.valid()) return;
    this.admin.saveLive(d);
    this.draft.set(null);
  }

  /** ISO (UTC) → value for <input type="datetime-local"> in Cairo time. */
  protected local(iso: string): string {
    const d = new Date(iso);
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d);
    const g = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
    return `${g('year')}-${g('month')}-${g('day')}T${g('hour') === '24' ? '00' : g('hour')}:${g('minute')}`;
  }

  /** Cairo local time → ISO. Uses the offset Cairo has at that moment. */
  protected iso(local: string): string {
    if (!local) return new Date().toISOString();
    const guess = new Date(local + 'Z');
    const cairo = new Date(guess.toLocaleString('en-US', { timeZone: 'Africa/Cairo' }));
    const utc = new Date(guess.toLocaleString('en-US', { timeZone: 'UTC' }));
    return new Date(guess.getTime() - (cairo.getTime() - utc.getTime())).toISOString();
  }
}
