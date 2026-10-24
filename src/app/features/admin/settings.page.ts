import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AdminService } from '../../core/data/admin.service';
import { saveCustomAssistantAccount } from '../../core/data/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AcademySettings, SiteTheme, UserPortalTheme } from '../../core/models/admin';
import { AccessEditorComponent } from './access-editor.component';
import { AdminHeaderComponent, DrawerComponent, InitialsComponent } from './admin-ui';

type BoolKey = { [K in keyof AcademySettings]-?: NonNullable<AcademySettings[K]> extends boolean ? K : never }[keyof AcademySettings];

@Component({
  selector: 'app-admin-settings',
  imports: [NgTemplateOutlet, FormsModule, RouterLink, LucideAngularModule, TranslatePipe, AdminHeaderComponent, InitialsComponent, AccessEditorComponent, DrawerComponent],
  template: `
    <div class="space-y-6 pb-24">
      <app-admin-header [title]="'admin.settings.title' | t" [subtitle]="'admin.settings.subtitle' | t">
        <button type="button" class="btn btn-primary" (click)="save()">
          <lucide-icon [name]="saved() ? 'circle-check' : 'save'" [size]="16" />
          {{ saved() ? ('admin.settings.saved' | t) : ('admin.settings.save' | t) }}
        </button>
      </app-admin-header>

      @if (saveError()) { <p class="note tone-danger" role="alert">{{ saveError() }}</p> }
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
                <span class="grid h-16 w-16 place-items-center rounded-card-lg bg-primary text-white overflow-hidden shadow-card">
                  @if (logoUrl()) {
                    <img [src]="logoUrl()" alt="Academy Logo" class="h-full w-full object-cover" />
                  } @else {
                    <lucide-icon name="book-open" [size]="32" />
                  }
                </span>
                <div>
                  <p class="font-display text-sm font-semibold text-ink">{{ 'admin.settings.logo' | t }}</p>
                  <div class="mt-2 flex gap-2">
                    <button type="button" class="btn btn-soft btn-sm" (click)="uploadLogo()">
                      <lucide-icon name="upload" [size]="14" />{{ 'admin.settings.upload' | t }}
                    </button>
                    @if (logoUrl()) {
                      <button type="button" class="btn btn-ghost btn-sm" (click)="removeLogo()">
                        {{ 'admin.settings.remove' | t }}
                      </button>
                    }
                  </div>
                </div>
              </div>
              <div class="grid gap-5 sm:grid-cols-2">
                <label class="block"><span class="field-label">{{ 'admin.settings.name' | t }}</span><input class="input input-plain" [ngModel]="f.name" (ngModelChange)="set('name', $event)" /></label>
                <label class="block"><span class="field-label">{{ 'admin.settings.whatsapp' | t }}</span><input class="input input-plain [unicode-bidi:plaintext]" [ngModel]="f.whatsapp" (ngModelChange)="set('whatsapp', $event)" /></label>
                <label class="block"><span class="field-label">{{ 'admin.settings.email' | t }}</span><input type="email" class="input input-plain [unicode-bidi:plaintext]" [ngModel]="f.supportEmail" (ngModelChange)="set('supportEmail', $event)" /></label>
                <label class="block"><span class="field-label">{{ 'admin.settings.hours' | t }}</span><input class="input input-plain" [ngModel]="f.supportHours" (ngModelChange)="set('supportHours', $event)" /></label>
              </div>
            </section>

            <!-- Theme & Announcement Popup -->
            <section id="appearance" class="card scroll-mt-24 space-y-5 p-5 sm:p-6">
              <ng-container *ngTemplateOutlet="head; context: { icon: 'palette', id: 'appearance' }" />

              <!-- User / Student Portal Theme Palette -->
              <div class="rounded-card-lg border border-line/70 p-4 space-y-3">
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="font-display text-sm font-semibold text-ink">User / Student Portal Theme</h3>
                    <p class="text-xs text-ink-muted">Choose the color theme automatically applied to all student and public pages.</p>
                  </div>
                  <span class="tag tone-brand">Live Dynamic Theme</span>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                  @for (t of themePalettes; track t.id) {
                    <button type="button" (click)="setUserPortalTheme(t.id)"
                      class="flex flex-col items-center gap-2 p-3 rounded-card border transition text-center"
                      [class]="(f.userPortalTheme || 'classic') === t.id ? 'border-primary ring-2 ring-primary/40 bg-white shadow-card' : 'border-line hover:border-primary/30 bg-white/50'">
                      <span class="h-7 w-7 rounded-full shadow-inner flex items-center justify-center text-white" [style.backgroundColor]="t.color">
                        @if ((f.userPortalTheme || 'classic') === t.id) {
                          <lucide-icon name="check" [size]="14" [strokeWidth]="3" />
                        }
                      </span>
                      <div>
                        <p class="font-display text-xs font-bold text-ink leading-tight">{{ t.name }}</p>
                        <p class="text-[0.6875rem] text-ink-muted mt-0.5">{{ t.desc }}</p>
                      </div>
                    </button>
                  }
                </div>
              </div>

              <div>
                <label class="block font-display text-sm font-semibold text-ink mb-2">{{ 'admin.settings.themeMode' | t }}</label>
                <div class="seg max-w-sm">
                  <button type="button" [class.seg-on]="(f.theme || 'light') === 'light'" (click)="setThemeMode('light')">{{ 'admin.settings.themeLight' | t }}</button>
                  <button type="button" [class.seg-on]="f.theme === 'dark'" (click)="setThemeMode('dark')">{{ 'admin.settings.themeDark' | t }}</button>
                  <button type="button" [class.seg-on]="f.theme === 'system'" (click)="setThemeMode('system')">{{ 'admin.settings.themeSystem' | t }}</button>
                </div>
              </div>

              <div class="rounded-card-lg border border-line/70 p-4 space-y-4">
                <div class="flex items-center justify-between gap-4">
                  <div>
                    <h3 class="font-display text-sm font-semibold text-ink">{{ 'admin.settings.popupTitle' | t }}</h3>
                    <p class="text-xs text-ink-muted">{{ 'admin.settings.popupHint' | t }}</p>
                  </div>
                  <button type="button" role="switch" class="switch" [attr.aria-checked]="f.popupMessage.enabled" (click)="togglePopup()">
                    <span class="sr-only">{{ 'admin.settings.popupTitle' | t }}</span>
                  </button>
                </div>

                @if (f.popupMessage.enabled) {
                  <div class="grid gap-4 sm:grid-cols-2 pt-2">
                    <label class="block">
                      <span class="field-label">{{ 'admin.settings.bannerTitle' | t }}</span>
                      <input class="input input-plain" [ngModel]="f.popupMessage.title" (ngModelChange)="setPopupField('title', $event)" />
                    </label>
                    <label class="block">
                      <span class="field-label">{{ 'admin.settings.bannerType' | t }}</span>
                      <select class="input input-plain" [ngModel]="f.popupMessage.type" (ngModelChange)="setPopupField('type', $event)">
                        <option value="announcement">Announcement (Brand)</option>
                        <option value="info">Information (Blue)</option>
                        <option value="warning">Warning (Amber)</option>
                        <option value="success">Success (Green)</option>
                      </select>
                    </label>
                    <label class="block sm:col-span-2">
                      <span class="field-label">{{ 'admin.settings.bannerMsg' | t }}</span>
                      <input class="input input-plain" [ngModel]="f.popupMessage.message" (ngModelChange)="setPopupField('message', $event)" />
                    </label>
                    <label class="block">
                      <span class="field-label">{{ 'admin.settings.bannerLinkText' | t }}</span>
                      <input class="input input-plain" [ngModel]="f.popupMessage.linkText" (ngModelChange)="setPopupField('linkText', $event)" />
                    </label>
                    <label class="block">
                      <span class="field-label">{{ 'admin.settings.bannerLinkUrl' | t }}</span>
                      <input class="input input-plain" [ngModel]="f.popupMessage.linkUrl" (ngModelChange)="setPopupField('linkUrl', $event)" />
                    </label>
                  </div>
                }
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
                <span class="flex-1">
                  <strong class="block font-display text-sm">{{ 'admin.settings.providerTitle' | t }}</strong>
                  @if (f.providerConnected) {
                    <span class="text-xs text-success font-semibold flex items-center gap-1 mt-0.5"><lucide-icon name="circle-check" [size]="14" /> Paymob Live Gateway Connected (Cards, Wallets, Meeza)</span>
                  } @else {
                    <span class="text-xs text-ink-muted">{{ 'admin.settings.providerText' | t }}</span>
                  }
                </span>
                <button type="button" class="btn btn-sm" [class]="f.providerConnected ? 'btn-outline border-success text-success hover:bg-success-soft' : 'btn-soft'" (click)="toggleProvider()">
                  <lucide-icon [name]="f.providerConnected ? 'check' : 'link'" [size]="14" />
                  {{ f.providerConnected ? 'Connected (Toggle)' : ('admin.settings.connectProvider' | t) }}
                </button>
              </div>
              <ng-container *ngTemplateOutlet="toggle; context: { key: 'manualEnabled', label: 'admin.settings.manual', hint: 'admin.settings.manualHint' }" />
              @if (f.manualEnabled) {
                <div class="grid gap-5 sm:grid-cols-3">
                  <label class="block"><span class="field-label">{{ 'admin.settings.instapay' | t }}</span><input class="input input-plain [unicode-bidi:plaintext]" [ngModel]="f.instapayAddress" (ngModelChange)="set('instapayAddress', $event)" /></label>
                  <label class="block"><span class="field-label">{{ 'admin.settings.vodafone' | t }}</span><input class="input input-plain [unicode-bidi:plaintext]" [ngModel]="f.vodafoneNumber" (ngModelChange)="set('vodafoneNumber', $event)" /></label>
                  <label class="block"><span class="field-label">{{ 'admin.settings.etisalat' | t }}</span><input class="input input-plain [unicode-bidi:plaintext]" [ngModel]="f.etisalatNumber" (ngModelChange)="set('etisalatNumber', $event)" /></label>
                </div>
              }
              <ng-container *ngTemplateOutlet="toggle; context: { key: 'flagDuplicates', label: 'admin.settings.duplicates', hint: 'admin.settings.duplicatesHint' }" />
            </section>

            <!-- Live -->
            <section id="live" class="card scroll-mt-24 space-y-5 p-5 sm:p-6">
              <ng-container *ngTemplateOutlet="head; context: { icon: 'radio', id: 'live' }" />
              <div class="note tone-brand flex-col sm:flex-row sm:items-center">
                <span class="icon-tile bg-white"><lucide-icon name="video" [size]="18" /></span>
                <span class="flex-1">
                  <strong class="block font-display text-sm text-ink">{{ 'admin.settings.muxTitle' | t }}</strong>
                  @if (f.muxConnected) {
                    <span class="text-xs text-success font-semibold flex items-center gap-1 mt-0.5"><lucide-icon name="circle-check" [size]="14" /> Mux Live Streaming API Connected & Active</span>
                  } @else {
                    <span class="text-xs text-ink-muted">{{ 'admin.settings.muxText' | t }}</span>
                  }
                </span>
                <button type="button" class="btn btn-sm" [class]="f.muxConnected ? 'btn-outline border-success text-success hover:bg-success-soft' : 'btn-primary'" (click)="toggleMux()">
                  <lucide-icon [name]="f.muxConnected ? 'check' : 'link'" [size]="14" />
                  {{ f.muxConnected ? 'Connected (Toggle)' : ('admin.settings.connectMux' | t) }}
                </button>
              </div>
              <div class="grid gap-5 sm:grid-cols-2">
                <label class="block"><span class="field-label">{{ 'admin.settings.maxViewers' | t }}</span><input type="number" min="1" class="input input-plain" [ngModel]="f.maxViewers" (ngModelChange)="set('maxViewers', +$event)" />
                  <span class="mt-1.5 flex items-center gap-1.5 text-xs text-ink-muted"><lucide-icon name="info" [size]="13" />{{ 'admin.settings.maxViewersHint' | t }}</span></label>
                <label class="block"><span class="field-label">{{ 'admin.settings.joinOpens' | t }}</span>
                  <span class="relative block"><input type="number" min="0" class="input input-plain pe-20" [ngModel]="f.joinOpensMin" (ngModelChange)="set('joinOpensMin', +$event)" /><span class="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-muted">{{ 'admin.min' | t }}</span></span></label>
              </div>
              <div class="rounded-card-lg border border-line/70 p-4 space-y-2">
                <label class="block">
                  <span class="field-label">Broadcast / Live Stream Link (YouTube / Vimeo / External)</span>
                  <input class="input input-plain [unicode-bidi:plaintext]" [ngModel]="f.liveStreamUrl" (ngModelChange)="set('liveStreamUrl', $event)" placeholder="https://www.youtube.com/watch?v=... or https://youtube.com/live/..." dir="ltr" />
                </label>
                <p class="text-xs text-ink-muted">Students opening scheduled live sessions will be directed to this broadcast stream.</p>
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
                  <button type="button" [class.seg-on]="f.defaultLang === 'en'" (click)="changeDefaultLang('en')">English</button>
                  <button type="button" [class.seg-on]="f.defaultLang === 'ar'" (click)="changeDefaultLang('ar')" lang="ar">العربية</button>
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
                  @if (m.role !== 'owner') {
                    <button type="button" class="btn-icon text-danger hover:bg-red-50" (click)="admin.removeStaffMember(m.id)" title="Remove member">
                      <lucide-icon name="trash-2" [size]="15" />
                    </button>
                  }
                </div>
              }
              <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button type="button" class="btn btn-soft" (click)="openInviteStaff.set(true)"><lucide-icon name="plus" [size]="16" />{{ 'admin.settings.invite' | t }}</button>
                <a routerLink="/admin/metrics" class="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
                  <lucide-icon name="chart-column" [size]="14" />Go to Assistant Metrics &rarr;
                </a>
              </div>
            </section>
          </div>
        </div>

        @if (openInviteStaff()) {
          <app-drawer title="Invite Staff Member" subtitle="Add an admin or assistant to manage the academy." (closed)="openInviteStaff.set(false)">
            <div class="space-y-4">
              <label class="block">
                <span class="field-label">Full Name</span>
                <input type="text" class="input" [ngModel]="newStaffName()" (ngModelChange)="newStaffName.set($event)" placeholder="e.g. Omar Tarek" />
              </label>
              <label class="block">
                <span class="field-label">Email</span>
                <input type="email" class="input" [ngModel]="newStaffEmail()" (ngModelChange)="newStaffEmail.set($event)" placeholder="staff@adelmostafa.com" dir="ltr" />
              </label>
              <label class="block">
                <span class="field-label">Role</span>
                <select class="input" [ngModel]="newStaffRole()" (ngModelChange)="newStaffRole.set($event)">
                  <option value="admin">Administrator (Full Access)</option>
                  <option value="assistant">Teaching Assistant (Receipts & Q&A)</option>
                  <option value="reviewer">Content Reviewer</option>
                </select>
              </label>
              <label class="block">
                <span class="field-label">Login Password</span>
                <input type="password" class="input" [ngModel]="newStaffPassword()" (ngModelChange)="newStaffPassword.set($event)" placeholder="Set login password (min 8 characters)" dir="ltr" />
              </label>
            </div>
            <div footer class="flex gap-2 w-full">
              <button type="button" class="btn btn-ghost flex-1" (click)="openInviteStaff.set(false)">Cancel</button>
              <button type="button" class="btn btn-primary flex-1" [disabled]="!newStaffName().trim() || !newStaffEmail().trim()" (click)="inviteStaff()">Add Member</button>
            </div>
          </app-drawer>
        }

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
  protected readonly saveError = signal<string | null>(null);
  protected readonly admin = inject(AdminService);
  protected readonly i18n = inject(LanguageService);
  private readonly loaded = toSignal(this.admin.getSettings());

  protected readonly form = linkedSignal<AcademySettings | undefined>(() => (this.loaded() ? { ...this.loaded()! } : undefined));
  private readonly baseline = linkedSignal(() => JSON.stringify(this.loaded() ?? {}));
  protected readonly dirty = computed(() => !!this.form() && JSON.stringify(this.form()) !== this.baseline());
  protected readonly saved = signal(false);
  protected readonly active = signal('general');

  // Custom logo state
  protected readonly logoUrl = signal<string | null>(null);

  // Invite staff drawer state
  protected readonly openInviteStaff = signal(false);
  protected readonly newStaffName = signal('');
  protected readonly newStaffEmail = signal('');
  protected readonly newStaffRole = signal<'admin' | 'assistant' | 'reviewer'>('assistant');
  protected readonly newStaffPassword = signal('');

  // User Portal Theme Palettes
  protected readonly themePalettes = [
    { id: 'classic' as UserPortalTheme, name: 'Café au Lait', color: '#4E342E', desc: 'Original warm coffee & bronze' },
    { id: 'navy' as UserPortalTheme, name: 'Royal Blue', color: '#1E3A8A', desc: 'Oxford navy & cobalt' },
    { id: 'emerald' as UserPortalTheme, name: 'Scholar Emerald', color: '#065F46', desc: 'Prestige forest & mint' },
    { id: 'purple' as UserPortalTheme, name: 'Imperial Purple', color: '#581C87', desc: 'Royal violet & lilac' },
    { id: 'gold' as UserPortalTheme, name: 'Prestige Gold', color: '#854D0E', desc: 'Warm amber & gold bronze' },
  ];

  protected readonly sections = [
    { id: 'general', icon: 'settings' },
    { id: 'appearance', icon: 'palette' },
    { id: 'payments', icon: 'banknote' },
    { id: 'live', icon: 'radio' },
    { id: 'languages', icon: 'languages' },
    { id: 'team', icon: 'users' },
  ];

  protected set<K extends keyof AcademySettings>(key: K, value: AcademySettings[K]): void {
    this.saved.set(false);
    this.form.update((f) => (f ? { ...f, [key]: value } : f));
  }

  protected changeDefaultLang(lang: 'en' | 'ar'): void {
    this.set('defaultLang', lang);
    this.i18n.setLang(lang);
  }

  protected setUserPortalTheme(t: UserPortalTheme): void {
    this.set('userPortalTheme', t);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-user-theme', t);
    }
  }

  protected setThemeMode(m: SiteTheme): void {
    this.set('theme', m);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', m);
    }
  }

  protected uploadLogo(): void {
    this.logoUrl.set('images/intro-thumbnail.jpg');
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 2000);
  }

  protected removeLogo(): void {
    this.logoUrl.set(null);
  }

  protected toggleProvider(): void {
    const cur = !!this.form()?.providerConnected;
    this.set('providerConnected', !cur);
  }

  protected toggleMux(): void {
    const cur = !!this.form()?.muxConnected;
    this.set('muxConnected', !cur);
  }

  protected inviteStaff(): void {
    const name = this.newStaffName().trim();
    const email = this.newStaffEmail().trim();
    const role = this.newStaffRole();
    const pw = this.newStaffPassword().trim() || 'assistant123';
    if (!name || !email) return;

    const staffId = 'staff_' + Date.now();
    const initials = name.slice(0, 2).toUpperCase();

    if (role === 'assistant') {
      saveCustomAssistantAccount({
        id: staffId,
        fullName: name,
        email,
        password: pw,
        initials,
        role: 'assistant',
        createdAt: new Date().toISOString(),
        scopes: ['receipts', 'attendance', 'qa'],
      });
    }

    this.admin.addStaffMember({
      id: staffId,
      name,
      email,
      role: role as any,
      initials,
      scopes: role === 'assistant' ? ['receipts', 'attendance', 'qa'] : ['all'],
    });
    this.openInviteStaff.set(false);
    this.newStaffName.set('');
    this.newStaffEmail.set('');
    this.newStaffPassword.set('');
  }

  protected togglePopup(): void {
    const cur = this.form()?.popupMessage ?? {
      enabled: false,
      title: 'Announcement',
      message: '',
      type: 'announcement',
      dismissible: true,
    };
    this.set('popupMessage', { ...cur, enabled: !cur.enabled });
  }

  protected setPopupField(key: string, val: any): void {
    const cur = this.form()?.popupMessage ?? {
      enabled: true,
      title: '',
      message: '',
      type: 'announcement',
      dismissible: true,
    };
    this.set('popupMessage', { ...cur, [key]: val });
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
    this.saveError.set(null);
    this.admin.saveSettings(f).subscribe({
      next: () => { this.baseline.set(JSON.stringify(f)); this.saved.set(true); setTimeout(() => this.saved.set(false), 2500); },
      error: (error: Error) => { this.saved.set(false); this.saveError.set(error.message || 'Settings were not saved'); }
    });
  }
}
