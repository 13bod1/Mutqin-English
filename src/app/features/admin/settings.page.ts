import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AdminService } from '../../core/data/admin.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AcademySettings } from '../../core/models/admin';
import { AccessEditorComponent } from './access-editor.component';
import { AdminHeaderComponent, InitialsComponent } from './admin-ui';

type BoolKey = { [K in keyof AcademySettings]: AcademySettings[K] extends boolean ? K : never }[keyof AcademySettings];

@Component({
  selector: 'app-admin-settings',
  imports: [NgTemplateOutlet, FormsModule, LucideAngularModule, TranslatePipe, AdminHeaderComponent, InitialsComponent, AccessEditorComponent],
  template: `
    <div class="space-y-6 pb-24">
      <app-admin-header [title]="'admin.settings.title' | t" [subtitle]="'admin.settings.subtitle' | t" />

      @if (form(); as f) {
        <div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav class="card hidden p-2 lg:sticky lg:top-24 lg:block" [attr.aria-label]="'admin.settings.title' | t">
            @for (s of sections; track s.id) {
              <a [href]="'#' + s.id" (click)="active.set(s.id)" class="flex items-center gap-2.5 rounded-card px-3 py-2.5 font-display text-sm transition"
                [class]="active() === s.id ? 'bg-surface-tint font-bold text-primary' : 'font-medium text-ink-body hover:bg-surface-warm'">
                <lucide-icon [name]="s.icon" [size]="16" />{{ 'admin.settings.s.' + s.id | t }}
              </a>
            }
          </nav>

          <div class="space-y-5">
            <!-- Academy -->
            <section id="general" class="card scroll-mt-24 space-y-5 p-5 sm:p-6">
              <ng-container *ngTemplateOutlet="head; context: { icon: 'graduation-cap', id: 'general' }" />
              <div class="flex items-center gap-5">
                <span class="grid h-16 w-16 place-items-center rounded-card-lg bg-primary text-white"><lucide-icon name="book-open" [size]="32" /></span>
                <div>
                  <p class="font-display text-sm font-semibold text-ink">{{ 'admin.settings.logo' | t }}</p>
                  <div class="mt-2 flex gap-2"><button type="button" class="btn btn-soft btn-sm"><lucide-icon name="upload" [size]="14" />{{ 'admin.settings.upload' | t }}</button><button type="button" class="btn btn-ghost btn-sm">{{ 'admin.settings.remove' | t }}</button></div>
                </div>
              </div>
              <div class="grid gap-5 sm:grid-cols-2">
                <label class="block"><span class="field-label">{{ 'admin.settings.name' | t }}</span><input class="input input-plain" [ngModel]="f.name" (ngModelChange)="set('name', $event)" /></label>
                <label class="block"><span class="field-label">{{ 'admin.settings.whatsapp' | t }}</span><input class="input input-plain [unicode-bidi:plaintext]" [ngModel]="f.whatsapp" (ngModelChange)="set('whatsapp', $event)" /></label>
                <label class="block"><span class="field-label">{{ 'admin.settings.email' | t }}</span><input type="email" class="input input-plain [unicode-bidi:plaintext]" [ngModel]="f.supportEmail" (ngModelChange)="set('supportEmail', $event)" /></label>
                <label class="block"><span class="field-label">{{ 'admin.settings.hours' | t }}</span><input class="input input-plain" [ngModel]="f.supportHours" (ngModelChange)="set('supportHours', $event)" /></label>
              </div>
            </section>

            <!-- Pricing & payments -->
            <section id="payments" class="card scroll-mt-24 space-y-5 p-5 sm:p-6">
              <ng-container *ngTemplateOutlet="head; context: { icon: 'banknote', id: 'payments' }" />
              <div class="grid gap-5 sm:grid-cols-2">
                <label class="block"><span class="field-label">{{ 'admin.settings.livePrice' | t }}</span>
                  <span class="relative block"><input type="number" min="0" class="input input-plain pe-16" [ngModel]="f.defaultLivePriceEgp" (ngModelChange)="set('defaultLivePriceEgp', +$event)" /><span class="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-muted">{{ 'admin.egp' | t }}</span></span></label>
                <label class="block"><span class="field-label">{{ 'admin.settings.seatHold' | t }}</span>
                  <span class="relative block"><input type="number" min="5" class="input input-plain pe-20" [ngModel]="f.seatHoldMinutes" (ngModelChange)="set('seatHoldMinutes', +$event)" /><span class="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-muted">{{ 'admin.min' | t }}</span></span></label>
              </div>
              <div class="rounded-card-lg border border-line/70 p-4">
                <p class="mb-3 font-display text-sm font-semibold text-ink">{{ 'admin.settings.lectureDefault' | t }}</p>
                <app-access-editor [value]="{ type: f.defaultLectureAccess, priceEgp: f.defaultLecturePriceEgp }" (valueChange)="setLectureDefault($event)" [defaultPrice]="150" />
              </div>
              <div class="note tone-warning flex-col sm:flex-row sm:items-center">
                <span class="icon-tile bg-white text-amber"><lucide-icon name="credit-card" [size]="18" /></span>
                <span class="flex-1"><strong class="block font-display text-sm">{{ 'admin.settings.providerTitle' | t }}</strong>{{ 'admin.settings.providerText' | t }}</span>
                <button type="button" class="btn btn-soft btn-sm"><lucide-icon name="link" [size]="14" />{{ 'admin.settings.connectProvider' | t }}</button>
              </div>
              <ng-container *ngTemplateOutlet="toggle; context: { key: 'manualEnabled', label: 'admin.settings.manual', hint: 'admin.settings.manualHint' }" />
              @if (f.manualEnabled) {
                <div class="grid gap-5 sm:grid-cols-2">
                  <label class="block"><span class="field-label">{{ 'admin.settings.instapay' | t }}</span><input class="input input-plain [unicode-bidi:plaintext]" [ngModel]="f.instapayAddress" (ngModelChange)="set('instapayAddress', $event)" /></label>
                  <label class="block"><span class="field-label">{{ 'admin.settings.vodafone' | t }}</span><input class="input input-plain [unicode-bidi:plaintext]" [ngModel]="f.vodafoneNumber" (ngModelChange)="set('vodafoneNumber', $event)" /></label>
                </div>
              }
              <ng-container *ngTemplateOutlet="toggle; context: { key: 'flagDuplicates', label: 'admin.settings.duplicates', hint: 'admin.settings.duplicatesHint' }" />
            </section>

            <!-- Live -->
            <section id="live" class="card scroll-mt-24 space-y-5 p-5 sm:p-6">
              <ng-container *ngTemplateOutlet="head; context: { icon: 'radio', id: 'live' }" />
              <div class="note tone-brand flex-col sm:flex-row sm:items-center">
                <span class="icon-tile bg-white"><lucide-icon name="video" [size]="18" /></span>
                <span class="flex-1"><strong class="block font-display text-sm text-ink">{{ 'admin.settings.muxTitle' | t }}</strong>{{ 'admin.settings.muxText' | t }}</span>
                <button type="button" class="btn btn-primary btn-sm"><lucide-icon name="link" [size]="14" />{{ 'admin.settings.connectMux' | t }}</button>
              </div>
              <div class="grid gap-5 sm:grid-cols-2">
                <label class="block"><span class="field-label">{{ 'admin.settings.maxViewers' | t }}</span><input type="number" min="1" class="input input-plain" [ngModel]="f.maxViewers" (ngModelChange)="set('maxViewers', +$event)" />
                  <span class="mt-1.5 flex items-center gap-1.5 text-xs text-ink-muted"><lucide-icon name="info" [size]="13" />{{ 'admin.settings.maxViewersHint' | t }}</span></label>
                <label class="block"><span class="field-label">{{ 'admin.settings.joinOpens' | t }}</span>
                  <span class="relative block"><input type="number" min="0" class="input input-plain pe-20" [ngModel]="f.joinOpensMin" (ngModelChange)="set('joinOpensMin', +$event)" /><span class="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-muted">{{ 'admin.min' | t }}</span></span></label>
              </div>
              <ng-container *ngTemplateOutlet="toggle; context: { key: 'recordReplays', label: 'admin.settings.record', hint: 'admin.settings.recordHint' }" />
              <ng-container *ngTemplateOutlet="toggle; context: { key: 'slowMode', label: 'admin.settings.slow', hint: 'admin.settings.slowHint' }" />
            </section>

            <!-- Languages -->
            <section id="languages" class="card scroll-mt-24 space-y-5 p-5 sm:p-6">
              <ng-container *ngTemplateOutlet="head; context: { icon: 'languages', id: 'languages' }" />
              <div class="flex flex-wrap items-center justify-between gap-3">
                <span><strong class="block font-display text-sm text-ink">{{ 'admin.settings.defaultLang' | t }}</strong><span class="text-[0.8125rem] text-ink-muted">{{ 'admin.settings.defaultLangHint' | t }}</span></span>
                <div class="seg">
                  <button type="button" [class.seg-on]="f.defaultLang === 'en'" (click)="set('defaultLang', 'en')">English</button>
                  <button type="button" [class.seg-on]="f.defaultLang === 'ar'" (click)="set('defaultLang', 'ar')" lang="ar">العربية</button>
                </div>
              </div>
              <ng-container *ngTemplateOutlet="toggle; context: { key: 'showLangSwitch', label: 'admin.settings.langSwitch', hint: 'admin.settings.langSwitchHint' }" />
            </section>

            <!-- Team -->
            <section id="team" class="card scroll-mt-24 space-y-5 p-5 sm:p-6">
              <ng-container *ngTemplateOutlet="head; context: { icon: 'users', id: 'team' }" />
              @for (m of admin.staff(); track m.id) {
                <div class="flex items-center gap-3">
                  <app-initials [text]="m.initials" [dark]="m.role === 'owner'" />
                  <div class="min-w-0 flex-1"><p class="font-display text-sm font-semibold text-ink">{{ m.name }}</p><p class="truncate text-xs text-ink-muted">{{ m.email }}</p></div>
                  <span class="tag hide-mobile" [class]="m.role === 'owner' ? 'bg-primary text-white' : 'tone-brand'">{{ 'admin.roles.' + m.role | t }}</span>
                  <button type="button" class="btn-icon" [attr.aria-label]="'admin.more' | t"><lucide-icon name="ellipsis" [size]="16" /></button>
                </div>
              }
              <button type="button" class="btn btn-soft"><lucide-icon name="plus" [size]="16" />{{ 'admin.settings.invite' | t }}</button>
            </section>
          </div>
        </div>

        @if (dirty() || saved()) {
          <div class="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-card-lg bg-ink px-5 py-3.5 text-white shadow-deep lg:start-[calc(16rem+2rem)]" role="status">
            <span class="flex items-center gap-2 font-display text-sm font-semibold">
              <lucide-icon [name]="saved() ? 'circle-check' : 'info'" [size]="16" />{{ (saved() ? 'admin.settings.saved' : 'admin.settings.unsaved') | t }}
            </span>
            @if (!saved()) {
              <span class="flex gap-2">
                <button type="button" class="btn btn-outline-light btn-sm" (click)="discard()">{{ 'admin.settings.discard' | t }}</button>
                <button type="button" class="btn btn-light btn-sm" (click)="save()">{{ 'admin.settings.save' | t }}</button>
              </span>
            }
          </div>
        }
      }
    </div>

    <ng-template #head let-icon="icon" let-id="id">
      <div class="flex items-center gap-3 border-b border-line/70 pb-5">
        <span class="icon-tile"><lucide-icon [name]="icon" [size]="18" /></span>
        <div><h2 class="font-display text-[1.0625rem] font-bold">{{ 'admin.settings.s.' + id | t }}</h2><p class="text-[0.8125rem] text-ink-muted">{{ 'admin.settings.d.' + id | t }}</p></div>
      </div>
    </ng-template>

    <ng-template #toggle let-key="key" let-label="label" let-hint="hint">
      <div class="flex items-center justify-between gap-4">
        <span><strong class="block font-display text-sm text-ink">{{ label | t }}</strong><span class="text-[0.8125rem] text-ink-muted">{{ hint | t }}</span></span>
        <button type="button" role="switch" class="switch" [attr.aria-checked]="isOn(key)" (click)="flip(key)"><span class="sr-only">{{ label | t }}</span></button>
      </div>
    </ng-template>
  `,
})
export class AdminSettingsPage {
  protected readonly admin = inject(AdminService);
  private readonly loaded = toSignal(this.admin.getSettings());

  protected readonly form = linkedSignal<AcademySettings | undefined>(() => (this.loaded() ? { ...this.loaded()! } : undefined));
  private readonly baseline = linkedSignal(() => JSON.stringify(this.loaded() ?? {}));
  protected readonly dirty = computed(() => !!this.form() && JSON.stringify(this.form()) !== this.baseline());
  protected readonly saved = signal(false);
  protected readonly active = signal('general');

  protected readonly sections = [
    { id: 'general', icon: 'settings' },
    { id: 'payments', icon: 'banknote' },
    { id: 'live', icon: 'radio' },
    { id: 'languages', icon: 'languages' },
    { id: 'team', icon: 'users' },
  ];

  protected set<K extends keyof AcademySettings>(key: K, value: AcademySettings[K]): void {
    this.saved.set(false);
    this.form.update((f) => (f ? { ...f, [key]: value } : f));
  }

  protected isOn(key: BoolKey): boolean {
    return !!this.form()?.[key];
  }

  protected flip(key: BoolKey): void {
    this.set(key, !this.form()![key]);
  }

  protected setLectureDefault(a: { type: AcademySettings['defaultLectureAccess']; priceEgp?: number }): void {
    this.saved.set(false);
    this.form.update((f) => (f ? { ...f, defaultLectureAccess: a.type, defaultLecturePriceEgp: a.priceEgp ?? f.defaultLecturePriceEgp } : f));
  }

  protected discard(): void {
    this.form.set({ ...JSON.parse(this.baseline()) });
  }

  protected save(): void {
    const f = this.form();
    if (!f) return;
    this.admin.saveSettings(f).subscribe(() => {
      this.baseline.set(JSON.stringify(f));
      this.saved.set(true);
      setTimeout(() => this.saved.set(false), 2500);
    });
  }
}
