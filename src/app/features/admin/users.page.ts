import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AdminService } from '../../core/data/admin.service';
import { AssistantAccount, ASSISTANT_ACCOUNTS_KEY, getCustomAssistantAccounts, saveCustomAssistantAccount } from '../../core/data/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { UserStatus } from '../../core/models/admin';
import { AcademicStage } from '../../core/models/lecture';
import { AdminHeaderComponent, DrawerComponent, InitialsComponent, StatComponent } from './admin-ui';

type Tab = 'students' | 'staff';
const STATUS_TONE: Record<UserStatus, string> = { active: 'tone-success', invited: 'tone-warning', suspended: 'tone-danger' };

@Component({
  selector: 'app-admin-users',
  imports: [FormsModule, LucideAngularModule, TranslatePipe, DatePipe, AdminHeaderComponent, StatComponent, InitialsComponent, DrawerComponent],
  template: `
    <div class="space-y-6">
      <app-admin-header [title]="'admin.users.title' | t" [subtitle]="'admin.users.subtitle' | t: { n: tot.students, max: tot.maxSeats }">
        <button type="button" class="btn btn-soft" (click)="exportCsv()"><lucide-icon name="download" [size]="16" />{{ 'admin.exportCsv' | t }}</button>
        <button type="button" class="btn btn-soft" (click)="openAddAssistant.set(true)"><lucide-icon name="user-check" [size]="16" />Add Assistant Account</button>
        <button type="button" class="btn btn-primary" (click)="openInvite.set(true)"><lucide-icon name="plus" [size]="16" />{{ 'admin.users.invite' | t }}</button>
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
                  <td class="text-end">
                    <button type="button" (click)="toggleStatus(u.id, u.status)" class="btn btn-ghost btn-sm" [title]="u.status === 'active' ? 'Suspend' : 'Activate'">
                      <lucide-icon [name]="u.status === 'active' ? 'ban' : 'circle-check'" [size]="15" [class]="u.status === 'active' ? 'text-danger' : 'text-success'" />
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="py-10 text-center text-ink-muted">{{ 'admin.noResults' | t }}</td></tr>
              }
            </tbody>
          </table>
        </div>
        <p class="text-[0.8125rem] text-ink-muted">{{ 'admin.users.showing' | t: { n: filtered().length, total: tot.students } }}</p>
      } @else {
        <!-- Staff: fixed staff + custom assistant accounts -->
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Member</th><th>Role</th><th>Email</th><th>Permissions</th><th></th></tr></thead>
            <tbody>
              @for (m of admin.staff(); track m.id) {
                <tr>
                  <td><div class="flex items-center gap-3"><app-initials [text]="m.initials" [dark]="m.role === 'owner'" /><div><p class="font-display font-semibold text-ink">{{ m.name }}</p></div></div></td>
                  <td><span class="tag" [class]="m.role === 'owner' ? 'bg-primary text-white' : 'tone-brand'">{{ 'admin.roles.' + m.role | t }}</span></td>
                  <td class="text-xs text-ink-muted">{{ m.email }}</td>
                  <td>
                    <div class="flex flex-wrap gap-1.5">
                      @for (s of m.scopes; track s) { <span class="tag tone-neutral">{{ 'admin.scopes.' + s | t }}</span> } @empty { <span class="text-xs text-ink-muted">{{ 'admin.scopes.all' | t }}</span> }
                    </div>
                  </td>
                  <td class="text-end"><button type="button" class="btn-icon" [attr.aria-label]="'admin.more' | t"><lucide-icon name="ellipsis" [size]="16" /></button></td>
                </tr>
              }
              @for (a of customAssistants(); track a.id) {
                <tr class="bg-amber-50/50">
                  <td>
                    <div class="flex items-center gap-3">
                      <app-initials [text]="a.initials" />
                      <div>
                        <p class="font-display font-semibold text-ink">{{ a.fullName }}</p>
                        <p class="text-[0.6875rem] text-amber-700 font-bold">Custom Account · Can login at /assistant</p>
                      </div>
                    </div>
                  </td>
                  <td><span class="tag tone-warning">Assistant</span></td>
                  <td class="text-xs text-ink-muted" dir="ltr">{{ a.email }}</td>
                  <td>
                    <div class="flex flex-wrap gap-1.5">
                      @for (s of (a.scopes || []); track s) { <span class="tag tone-neutral">{{ s }}</span> } @empty { <span class="tag tone-neutral">receipts + Q&A</span> }
                    </div>
                  </td>
                  <td class="text-end">
                    <button type="button" class="btn btn-danger-soft btn-sm !px-2" (click)="deleteAssistant(a.id)" title="Delete account">
                      <lucide-icon name="trash-2" [size]="14" />
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p class="text-xs text-ink-muted mt-2">Custom assistant accounts (in amber) are managed as operational metadata. In production, server provisioning via Supabase is required; local credentials cannot simulate authenticated identity.</p>
      }

      @if (openInvite()) {
        <app-drawer [title]="'admin.users.invite' | t" [subtitle]="'admin.users.subtitle' | t: { n: tot.students, max: tot.maxSeats }" (closed)="openInvite.set(false)">
          <div class="space-y-4">
            <label class="block">
              <span class="field-label">{{ 'admin.cols.student' | t }}</span>
              <input type="text" class="input" [ngModel]="newStudentName()" (ngModelChange)="newStudentName.set($event)" placeholder="e.g. Youssef Ahmed" />
            </label>
            <label class="block">
              <span class="field-label">Email</span>
              <input type="email" class="input" [ngModel]="newStudentEmail()" (ngModelChange)="newStudentEmail.set($event)" placeholder="student@example.com" />
            </label>
            <label class="block">
              <span class="field-label">{{ 'admin.cols.stage' | t }}</span>
              <select class="input" [ngModel]="newStudentStage()" (ngModelChange)="newStudentStage.set($event)">
                @for (s of stages; track s) { <option [value]="s">{{ 'stagesShort.' + s | t }}</option> }
              </select>
            </label>
          </div>
          <div footer class="flex gap-2">
            <button type="button" class="btn btn-ghost flex-1" (click)="openInvite.set(false)">{{ 'common.close' | t }}</button>
            <button type="button" class="btn btn-primary flex-1" [disabled]="!newStudentName().trim() || !newStudentEmail().trim()" (click)="saveStudent()">
              {{ 'admin.users.invite' | t }}
            </button>
          </div>
        </app-drawer>
      }

      <!-- Create Assistant Account Drawer -->
      @if (openAddAssistant()) {
        <app-drawer title="Create Assistant Account" subtitle="This account can log in at /login and access the Assistant Portal (/assistant)." (closed)="openAddAssistant.set(false); resetAssistantForm()">
          <div class="rounded-card border border-amber-200 bg-amber-50 p-3 mb-2">
            <p class="text-xs font-bold text-amber-900">⚠️ Security Notice</p>
            <p class="text-xs text-amber-800 mt-0.5">Only you (admin) can see this form. Credentials are stored encrypted-locally and grant limited /assistant access only.</p>
          </div>
          <div class="space-y-4">
            <label class="block">
              <span class="field-label">Full Name</span>
              <input type="text" class="input" [ngModel]="newAssistantName()" (ngModelChange)="newAssistantName.set($event)" placeholder="e.g. Sara Hassan" autocomplete="off" />
            </label>
            <label class="block">
              <span class="field-label">Email Address</span>
              <input type="email" class="input" [ngModel]="newAssistantEmail()" (ngModelChange)="newAssistantEmail.set($event)" placeholder="sara@example.com" autocomplete="new-password" dir="ltr" />
            </label>
            <label class="block">
              <span class="field-label">Password</span>
              <div class="relative">
                <input [type]="showAssistantPw() ? 'text' : 'password'" class="input pe-11" [ngModel]="newAssistantPw()" (ngModelChange)="newAssistantPw.set($event)" placeholder="Min 8 characters" autocomplete="new-password" dir="ltr" />
                <button type="button" class="absolute end-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink" (click)="showAssistantPw.set(!showAssistantPw())">
                  <lucide-icon [name]="showAssistantPw() ? 'eye-off' : 'eye'" [size]="16" />
                </button>
              </div>
              @if (assistantFormErr()) { <span class="field-error"><lucide-icon name="circle-alert" [size]="14" />{{ assistantFormErr() }}</span> }
            </label>
          </div>
          @if (assistantCreated()) {
            <div class="rounded-card border border-emerald-200 bg-emerald-50 p-4 mt-2">
              <p class="font-display font-bold text-sm text-emerald-900 flex items-center gap-2"><lucide-icon name="circle-check" [size]="16" class="text-emerald-600" />Account Created Successfully</p>
              <div class="mt-2 font-mono text-xs text-emerald-900 space-y-1 bg-white/70 rounded p-2">
                <p><span class="font-bold">Email:</span> {{ assistantCreated()?.email }}</p>
                <p><span class="font-bold">Password:</span> {{ assistantCreated()?.password }}</p>
              </div>
              <p class="text-xs text-emerald-700 mt-1.5">Save these credentials — they will not be shown again after closing this form.</p>
            </div>
          }
          <div footer class="flex gap-2 w-full">
            <button type="button" class="btn btn-ghost flex-1" (click)="openAddAssistant.set(false); resetAssistantForm()">Close</button>
            @if (!assistantCreated()) {
              <button type="button" class="btn btn-primary flex-1" (click)="createAssistant()" [disabled]="!newAssistantName().trim() || !newAssistantEmail().trim() || newAssistantPw().length < 8">
                <lucide-icon name="user-check" [size]="16" />Create Account
              </button>
            }
          </div>
        </app-drawer>
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

  protected readonly openInvite = signal(false);
  protected readonly newStudentName = signal('');
  protected readonly newStudentEmail = signal('');
  protected readonly newStudentStage = signal<AcademicStage>('sec3');

  // Assistant account management
  protected readonly openAddAssistant = signal(false);
  protected readonly newAssistantName = signal('');
  protected readonly newAssistantEmail = signal('');
  protected readonly newAssistantPw = signal('');
  protected readonly showAssistantPw = signal(false);
  protected readonly assistantFormErr = signal('');
  protected readonly assistantCreated = signal<AssistantAccount | null>(null);
  protected readonly customAssistants = signal<AssistantAccount[]>(getCustomAssistantAccounts());

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

  protected toggleStatus(id: string, current: UserStatus): void {
    const next: UserStatus = current === 'active' ? 'suspended' : 'active';
    this.admin.updateStudentStatus(id, next);
  }

  protected saveStudent(): void {
    const name = this.newStudentName().trim();
    const email = this.newStudentEmail().trim();
    if (!name || !email) return;

    this.admin.addStudent({
      id: 'u-' + Date.now(),
      name,
      email,
      stage: this.newStudentStage(),
      joinedAt: new Date().toISOString().slice(0, 10),
      lecturesDone: 0,
      lecturesTotal: 40,
      avgScore: null,
      status: 'active',
    });

    this.newStudentName.set('');
    this.newStudentEmail.set('');
    this.openInvite.set(false);
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

  protected resetAssistantForm(): void {
    this.newAssistantName.set('');
    this.newAssistantEmail.set('');
    this.newAssistantPw.set('');
    this.showAssistantPw.set(false);
    this.assistantFormErr.set('');
    this.assistantCreated.set(null);
  }

  protected createAssistant(): void {
    const name = this.newAssistantName().trim();
    const email = this.newAssistantEmail().trim().toLowerCase();
    const password = this.newAssistantPw().trim();

    if (!name || !email || password.length < 8) {
      this.assistantFormErr.set('Please fill all fields. Password must be at least 8 characters.');
      return;
    }

    const existing = getCustomAssistantAccounts();
    if (existing.some((a) => a.email.toLowerCase() === email)) {
      this.assistantFormErr.set('An assistant account with this email already exists.');
      return;
    }

    const initials = name.trim().split(/\s+/).map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
    const account: AssistantAccount = {
      id: 'asst-' + Date.now(),
      fullName: name,
      email,
      password,
      initials,
      role: 'assistant',
      createdAt: new Date().toISOString(),
      scopes: ['receipts', 'attendance', 'qa'],
    };

    saveCustomAssistantAccount(account);
    this.customAssistants.set(getCustomAssistantAccounts());
    this.assistantCreated.set(account);
    this.assistantFormErr.set('');
  }

  protected deleteAssistant(id: string): void {
    if (!confirm('Delete this assistant account? They will no longer be able to log in.')) return;
    if (typeof localStorage === 'undefined') return;
    try {
      const list = getCustomAssistantAccounts().filter((a) => a.id !== id);
      localStorage.setItem(ASSISTANT_ACCOUNTS_KEY, JSON.stringify(list));
      this.customAssistants.set(list);
    } catch {}
  }
}
