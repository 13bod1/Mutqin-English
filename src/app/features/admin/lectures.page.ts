import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AdminService } from '../../core/data/admin.service';
import { LanguageService } from '../../core/i18n/language.service';
import { LocalizePipe, TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminLecture, LectureState } from '../../core/models/admin';
import { AcademicStage } from '../../core/models/lecture';
import { AccessEditorComponent } from './access-editor.component';
import { AdminHeaderComponent, DrawerComponent, StatComponent } from './admin-ui';
import { accessLabel, accessTone } from './access-label';

type LecFilter = 'all' | 'published' | 'paid' | 'draft';
const STATE_TONE: Record<LectureState, string> = { published: 'tone-success', draft: 'tone-neutral', processing: 'tone-warning', scheduled: 'tone-gold' };

@Component({
  selector: 'app-admin-lectures',
  imports: [FormsModule, LucideAngularModule, TranslatePipe, LocalizePipe, DatePipe, DecimalPipe, AdminHeaderComponent, StatComponent, DrawerComponent, AccessEditorComponent],
  template: `
    <div class="space-y-6">
      <app-admin-header [title]="'admin.lectures.title' | t" [subtitle]="'admin.lectures.subtitle' | t">
        <button type="button" class="btn btn-primary" (click)="create()"><lucide-icon name="plus" [size]="16" />{{ 'admin.lectures.new' | t }}</button>
      </app-admin-header>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <app-stat [label]="'admin.stats.published' | t" [value]="tot.published + ''" icon="monitor-play" [note]="'admin.stats.paidCount' | t: { n: paidCount() }" />
        <app-stat [label]="'admin.stats.viewsOct' | t" [value]="(tot.viewsOct | number) ?? ''" icon="eye" [note]="'admin.stats.vsLast' | t: { n: '+18%' }" noteIcon="trending-up" noteClass="text-success" />
        <app-stat [label]="'admin.stats.watchTime' | t" [value]="'admin.hours' | t: { n: (tot.watchHours | number) ?? '' }" icon="clock" [note]="'admin.stats.avgWatch' | t: { n: 27 }" />
        <app-stat [label]="'admin.stats.storage' | t" [value]="tot.storageGb + ' GB'" icon="gauge" tone="tone-neutral" [note]="'admin.stats.ofPlan' | t: { n: tot.storagePlanGb }" />
      </div>

      <label class="flex cursor-pointer flex-col items-start gap-4 rounded-card-lg border-2 border-dashed border-primary-light/50 bg-surface-warm p-5 transition hover:border-primary sm:flex-row sm:items-center">
        <span class="icon-tile h-12 w-12 bg-surface-highlight/70"><lucide-icon name="cloud-upload" [size]="22" /></span>
        <span class="flex-1">
          <span class="block font-display text-base font-bold text-ink">{{ 'admin.lectures.uploadTitle' | t }}</span>
          <span class="block text-[0.8125rem] text-ink-body">{{ 'admin.lectures.uploadText' | t }}</span>
        </span>
        <span class="btn btn-primary"><lucide-icon name="upload" [size]="16" />{{ 'admin.lectures.choose' | t }}</span>
        <input type="file" accept="video/mp4" class="sr-only" (change)="create()" />
      </label>

      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div class="seg" role="tablist">
          @for (f of filters; track f) {
            <button type="button" role="tab" [class.seg-on]="filter() === f" [attr.aria-selected]="filter() === f" (click)="filter.set(f)">{{ 'admin.lectures.f.' + f | t: { n: count(f) } }}</button>
          }
        </div>
        <label class="relative md:w-72">
          <span class="sr-only">{{ 'admin.lectures.search' | t }}</span>
          <lucide-icon name="search" [size]="16" class="input-icon start-3.5" />
          <input type="search" class="input h-10 ps-10 text-sm" [ngModel]="query()" (ngModelChange)="query.set($event)" [placeholder]="'admin.lectures.search' | t" />
        </label>
      </div>

      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr><th>{{ 'admin.cols.lecture' | t }}</th><th>{{ 'admin.cols.stage' | t }}</th><th>{{ 'admin.cols.access' | t }}</th><th>{{ 'admin.cols.duration' | t }}</th><th>{{ 'admin.cols.views' | t }}</th><th>{{ 'admin.cols.status' | t }}</th><th><span class="sr-only">{{ 'admin.cols.actions' | t }}</span></th></tr>
          </thead>
          <tbody>
            @for (l of shown(); track l.id) {
              <tr>
                <td>
                  <div class="flex items-center gap-3.5">
                    <span class="grid h-12 w-20 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-[#2B1D19] text-white"><lucide-icon name="play" [size]="16" class="fill-white" /></span>
                    <div class="min-w-0">
                      <p class="font-display font-semibold text-ink">{{ l.title | loc }}</p>
                      @if (l.state === 'processing') {
                        <p class="mt-1 flex items-center gap-2 text-xs text-amber"><span class="progress-track h-1.5 w-24"><span class="progress-fill block bg-gold" [style.width.%]="l.uploadPercent"></span></span>{{ 'admin.lectures.uploading' | t: { n: l.uploadPercent ?? 0 } }}</p>
                      } @else if (l.state === 'scheduled' && l.publishAt) {
                        <p class="mt-1 text-xs text-gold-dark">{{ 'admin.lectures.publishes' | t: { date: (l.publishAt | date: 'd MMM, h:mm a' : 'Africa/Cairo' : i18n.lang()) ?? '' } }}</p>
                      } @else {
                        <p class="mt-1 text-xs capitalize text-ink-muted">{{ l.topic }}</p>
                      }
                    </div>
                  </div>
                </td>
                <td><span class="tag tone-brand whitespace-nowrap">{{ 'stagesShort.' + l.stage | t }}</span></td>
                <td><span class="tag whitespace-nowrap" [class]="tone(l)">{{ label(l) }}</span></td>
                <td>{{ l.durationMin ? ('common.minutes' | t: { n: l.durationMin }) : '—' }}</td>
                <td>{{ l.views === null ? '—' : (l.views | number) }}</td>
                <td><span class="tag" [class]="stateTone[l.state]">{{ 'admin.lectures.state.' + l.state | t }}</span></td>
                <td class="text-end">
                  <button type="button" class="btn-icon" (click)="edit(l)" [attr.aria-label]="'admin.edit' | t"><lucide-icon name="pencil" [size]="14" /></button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="py-10 text-center text-ink-muted">{{ 'admin.noResults' | t }}</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    @if (draft(); as d) {
      <app-drawer [title]="(isNew() ? 'admin.lectures.new' : 'admin.lectures.edit') | t" [subtitle]="'admin.lectures.drawerSub' | t" (closed)="draft.set(null)">
        <label class="block">
          <span class="field-label">{{ 'admin.lectures.titleEn' | t }}</span>
          <input class="input input-plain" [ngModel]="d.title.en" (ngModelChange)="patch({ title: { en: $event, ar: d.title.ar } })" dir="ltr" />
        </label>
        <label class="block">
          <span class="field-label">{{ 'admin.lectures.titleAr' | t }}</span>
          <input class="input input-plain" [ngModel]="d.title.ar" (ngModelChange)="patch({ title: { en: d.title.en, ar: $event } })" dir="rtl" lang="ar" />
        </label>
        <div class="grid grid-cols-2 gap-4">
          <label class="block">
            <span class="field-label">{{ 'admin.cols.stage' | t }}</span>
            <select class="input input-plain" [ngModel]="d.stage" (ngModelChange)="patch({ stage: $event })">
              @for (s of stages; track s) { <option [value]="s">{{ 'stagesShort.' + s | t }}</option> }
            </select>
          </label>
          <label class="block">
            <span class="field-label">{{ 'admin.cols.status' | t }}</span>
            <select class="input input-plain" [ngModel]="d.state" (ngModelChange)="patch({ state: $event })">
              @for (s of states; track s) { <option [value]="s">{{ 'admin.lectures.state.' + s | t }}</option> }
            </select>
          </label>
        </div>
        <app-access-editor [value]="d.access" (valueChange)="patch({ access: $event })" [defaultPrice]="150" />
        <p class="note tone-brand"><lucide-icon name="info" [size]="16" class="mt-0.5 shrink-0" />{{ 'admin.access.note' | t }}</p>
        <button footer type="button" class="btn btn-soft" (click)="draft.set(null)">{{ 'admin.cancel' | t }}</button>
        <button footer type="button" class="btn btn-primary" [disabled]="!valid()" (click)="save()">{{ 'admin.save' | t }}</button>
      </app-drawer>
    }
  `,
})
export class AdminLecturesPage {
  protected readonly admin = inject(AdminService);
  protected readonly i18n = inject(LanguageService);
  protected readonly tot = this.admin.totals;
  protected readonly stateTone = STATE_TONE;
  protected readonly stages: AcademicStage[] = ['prep', 'sec1', 'sec2', 'sec3', 'university'];
  protected readonly states: LectureState[] = ['published', 'draft', 'scheduled'];
  protected readonly filters: LecFilter[] = ['all', 'published', 'paid', 'draft'];

  protected readonly filter = signal<LecFilter>('all');
  protected readonly query = signal('');
  protected readonly draft = signal<AdminLecture | null>(null);
  protected readonly isNew = signal(false);

  protected readonly paidCount = computed(() => this.admin.lectures().filter((l) => l.access.type === 'paid').length);
  protected readonly shown = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.admin.lectures().filter((l) => this.match(l, this.filter()) && (!q || l.title.en.toLowerCase().includes(q) || l.title.ar.includes(q)));
  });
  protected readonly valid = computed(() => {
    const d = this.draft();
    return !!d && !!d.title.en.trim() && (d.access.type !== 'paid' || (d.access.priceEgp ?? 0) > 0);
  });

  protected count(f: LecFilter): number {
    return this.admin.lectures().filter((l) => this.match(l, f)).length;
  }

  private match(l: AdminLecture, f: LecFilter): boolean {
    if (f === 'all') return true;
    if (f === 'paid') return l.access.type === 'paid';
    if (f === 'draft') return l.state === 'draft' || l.state === 'scheduled';
    return l.state === 'published';
  }

  protected label(l: AdminLecture): string {
    return accessLabel(this.i18n, l.access);
  }

  protected tone(l: AdminLecture): string {
    return accessTone(l.access);
  }

  protected create(): void {
    this.isNew.set(true);
    this.draft.set({ id: 'new-' + Date.now(), title: { en: '', ar: '' }, topic: 'grammar', stage: 'sec3', durationMin: null, views: null, state: 'draft', access: { type: 'included' } });
  }

  protected edit(l: AdminLecture): void {
    this.isNew.set(false);
    this.draft.set(structuredClone(l));
  }

  protected patch(p: Partial<AdminLecture>): void {
    this.draft.update((d) => (d ? { ...d, ...p } : d));
  }

  protected save(): void {
    const d = this.draft();
    if (!d || !this.valid()) return;
    this.admin.saveLecture(d);
    this.draft.set(null);
  }
}
