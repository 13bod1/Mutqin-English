import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AdminService } from '../../core/data/admin.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { UserStatus } from '../../core/models/admin';
import { AcademicStage } from '../../core/models/lecture';
import { AdminHeaderComponent, InitialsComponent, StatComponent } from './admin-ui';

type Tab = 'students' | 'staff';
const STATUS_TONE: Record<UserStatus, string> = { active: 'tone-success', invited: 'tone-warning', suspended: 'tone-danger' };

@Component({
  selector: 'app-admin-users',
  imports: [FormsModule, LucideAngularModule, TranslatePipe, DatePipe, AdminHeaderComponent, StatComponent, InitialsComponent],
  template: `
    <div class="space-y-6">
      <app-admin-header [title]="'admin.users.title' | t" [subtitle]="'admin.users.subtitle' | t: { n: tot.students, max: tot.maxSeats }">
        <button type="button" class="btn btn-soft" (click)="exportCsv()"><lucide-icon name="download" [size]="16" />{{ 'admin.exportCsv' | t }}</button>
        <button type="button" class="btn btn-primary"><lucide-icon name="plus" [size]="16" />{{ 'admin.users.invite' | t }}</button>
      </app-admin-header>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <app-stat [label]="'admin.stats.students' | t" [value]="tot.students + ''" icon="users" [note]="'admin.stats.seatsLeft' | t: { n: tot.maxSeats - tot.students }" noteIcon="info" />
        <app-stat [label]="'admin.stats.activeWeek' | t" [value]="tot.activeWeek + ''" icon="user-check" [note]="'admin.stats.ofStudents' | t: { n: 81 }" noteIcon="activity" noteClass="text-success" />
        <app-stat [label]="'admin.stats.invites' | t" [value]="tot.invites + ''" icon="mail" tone="tone-warning" [note]="'admin.stats.invitesNote' | t" />
        <app-stat [label]="'admin.stats.suspended' | t" [value]="tot.suspended + ''" icon="user-x" tone="tone-danger" [note]="'admin.stats.suspendedNote' | t" />
      </div>

      <div class="seg" role="tablist">
        <button type="button" role="tab" [class.seg-on]="tab() === 'students'" [attr.aria-selected]="tab() === 'students'" (click)="tab.set('students')">{{ 'admin.users.students' | t: { n: tot.students } }}</button>
        <button type="button" role="tab" [class.seg-on]="tab() === 'staff'" [attr.aria-selected]="tab() === 'staff'" (click)="tab.set('staff')">{{ 'admin.users.staff' | t: { n: admin.staff().length } }}</button>
      </div>

      @if (tab() === 'students') {
        <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <label class="relative sm:w-80">
            <span class="sr-only">{{ 'admin.users.search' | t }}</span>
            <lucide-icon name="search" [size]="16" class="input-icon start-3.5" />
            <input type="search" class="input h-10 ps-10 text-sm" [ngModel]="query()" (ngModelChange)="query.set($event)" [placeholder]="'admin.users.search' | t" />
          </label>
          <select class="input input-plain h-10 w-auto pe-9 text-sm" [ngModel]="stage()" (ngModelChange)="stage.set($event)" [attr.aria-label]="'admin.filters.stage' | t">
            <option value="">{{ 'admin.filters.allStages' | t }}</option>
            @for (s of stages; track s) { <option [value]="s">{{ 'stagesShort.' + s | t }}</option> }
          </select>
          <select class="input input-plain h-10 w-auto pe-9 text-sm" [ngModel]="status()" (ngModelChange)="status.set($event)" [attr.aria-label]="'admin.filters.status' | t">
            <option value="">{{ 'admin.filters.allStatuses' | t }}</option>
            @for (s of statuses; track s) { <option [value]="s">{{ 'admin.status.' + s | t }}</option> }
          </select>
        </div>

        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>{{ 'admin.cols.student' | t }}</th><th>{{ 'admin.cols.stage' | t }}</th><th>{{ 'admin.cols.joined' | t }}</th>
                <th>{{ 'admin.cols.lectures' | t }}</th><th>{{ 'admin.cols.avgScore' | t }}</th><th>{{ 'admin.cols.status' | t }}</th><th><span class="sr-only">{{ 'admin.cols.actions' | t }}</span></th>
              </tr>
            </thead>
            <tbody>
              @for (u of filtered(); track u.id) {
                <tr>
                  <td>
                    <div class="flex items-center gap-3">
                      <app-initials [text]="initials(u.name)" />
                      <div><p class="font-display font-semibold text-ink">{{ u.name }}</p><p class="text-xs text-ink-muted">{{ u.email }}</p></div>
                    </div>
                  </td>
                  <td><span class="tag tone-brand whitespace-nowrap">{{ 'stagesShort.' + u.stage | t }}</span></td>
                  <td class="whitespace-nowrap">{{ u.joinedAt | date: 'd MMM y' : undefined : i18n.lang() }}</td>
                  <td dir="ltr" class="text-start">{{ u.lecturesDone }} / {{ u.lecturesTotal }}</td>
                  <td class="font-display font-semibold text-ink">{{ u.avgScore === null ? '—' : u.avgScore + '%' }}</td>
                  <td><span class="tag" [class]="tone[u.status]">{{ 'admin.status.' + u.status | t }}</span></td>
                  <td class="text-end"><button type="button" class="btn-icon" [attr.aria-label]="'admin.more' | t"><lucide-icon name="ellipsis" [size]="16" /></button></td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="py-10 text-center text-ink-muted">{{ 'admin.noResults' | t }}</td></tr>
              }
            </tbody>
          </table>
        </div>
        <p class="text-[0.8125rem] text-ink-muted">{{ 'admin.users.showing' | t: { n: filtered().length, total: tot.students } }}</p>
      } @else {
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>{{ 'admin.cols.member' | t }}</th><th>{{ 'admin.cols.role' | t }}</th><th>{{ 'admin.cols.permissions' | t }}</th><th></th></tr></thead>
            <tbody>
              @for (m of admin.staff(); track m.id) {
                <tr>
                  <td><div class="flex items-center gap-3"><app-initials [text]="m.initials" [dark]="m.role === 'owner'" /><div><p class="font-display font-semibold text-ink">{{ m.name }}</p><p class="text-xs text-ink-muted">{{ m.email }}</p></div></div></td>
                  <td><span class="tag" [class]="m.role === 'owner' ? 'bg-primary text-white' : 'tone-brand'">{{ 'admin.roles.' + m.role | t }}</span></td>
                  <td>
                    <div class="flex flex-wrap gap-1.5">
                      @for (s of m.scopes; track s) { <span class="tag tone-neutral">{{ 'admin.scopes.' + s | t }}</span> } @empty { <span class="text-xs text-ink-muted">{{ 'admin.scopes.all' | t }}</span> }
                    </div>
                  </td>
                  <td class="text-end"><button type="button" class="btn-icon" [attr.aria-label]="'admin.more' | t"><lucide-icon name="ellipsis" [size]="16" /></button></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class AdminUsersPage {
  protected readonly admin = inject(AdminService);
  protected readonly i18n = inject(LanguageService);
  protected readonly tot = this.admin.totals;
  protected readonly tone = STATUS_TONE;
  protected readonly stages: AcademicStage[] = ['prep', 'sec1', 'sec2', 'sec3', 'university'];
  protected readonly statuses: UserStatus[] = ['active', 'invited', 'suspended'];

  protected readonly tab = signal<Tab>('students');
  protected readonly query = signal('');
  protected readonly stage = signal('');
  protected readonly status = signal('');

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.admin.students().filter(
      (u) =>
        (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
        (!this.stage() || u.stage === this.stage()) &&
        (!this.status() || u.status === this.status()),
    );
  });

  protected initials(name: string): string {
    const p = name.split(/\s+/);
    return (p[0][0] + (p[1]?.[0] ?? '')).toUpperCase();
  }

  protected exportCsv(): void {
    const rows = [['Name', 'Email', 'Stage', 'Joined', 'Status'], ...this.filtered().map((u) => [u.name, u.email, u.stage, u.joinedAt, u.status])];
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'students.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
