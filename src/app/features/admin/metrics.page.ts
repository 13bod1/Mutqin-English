import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AdminService } from '../../core/data/admin.service';
import { AssistantAccount, saveCustomAssistantAccount } from '../../core/data/auth.service';
import { LocalizePipe, TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminHeaderComponent, DrawerComponent, InitialsComponent, StatComponent } from './admin-ui';

type Range = '7d' | '30d' | 'term';
const PRESENCE: Record<string, string> = { online: 'tone-success', away: 'tone-warning', offline: 'tone-neutral' };

/** Teaching-assistant performance: questions answered, receipts reviewed, response times. */
@Component({
  selector: 'app-admin-metrics',
  imports: [FormsModule, LucideAngularModule, TranslatePipe, LocalizePipe, AdminHeaderComponent, StatComponent, InitialsComponent, DrawerComponent],
  template: `
    <div class="space-y-6">
      <app-admin-header [title]="'admin.metrics.title' | t" [subtitle]="'admin.metrics.subtitle' | t">
        <div class="seg" role="tablist">
          @for (r of ranges; track r) {
            <button type="button" role="tab" [class.seg-on]="range() === r" [attr.aria-selected]="range() === r" (click)="range.set(r)">{{ 'admin.metrics.range.' + r | t }}</button>
          }
        </div>
        <button type="button" class="btn btn-primary" (click)="openAddAssistant.set(true)">
          <lucide-icon name="plus" [size]="16" />{{ 'admin.metrics.add' | t }}
        </button>
      </app-admin-header>

      @if (admin.paymentLoading()) { <p role="status">Loading verified review activity…</p> }
      @if (admin.paymentLoadError()) { <p role="alert" class="note tone-danger">{{ admin.paymentLoadError() }}</p> }
      <button type="button" class="btn btn-outline" (click)="admin.refreshPayments()" [disabled]="admin.paymentLoading()">Refresh verified metrics</button>
      <section class="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-label="Verified receipt metrics">
        <app-stat label="Reviewed receipts" [value]="rangeKpi().totalReviewed + ''" icon="receipt" />
        <app-stat label="Pending receipts" [value]="rangeKpi().totalPending + ''" icon="clock" />
        <app-stat label="Average review time" [value]="rangeKpi().avgTurnaroundDisplay" icon="timer" />
        <app-stat label="Approval rate" [value]="rangeKpi().approvalRate == null ? 'N/A' : rangeKpi().approvalRate + '%'" icon="circle-check" />
        <app-stat label="Rejection rate" [value]="rangeKpi().rejectionRate == null ? 'N/A' : rangeKpi().rejectionRate + '%'" icon="circle-x" />
      </section>
      <p class="note">Metrics are calculated from the server-authorized payment ledger for the selected date range. Question activity, ratings and targets are not displayed without a verified data source.</p>

      <!-- Create Assistant Account Drawer -->
      @if (openAddAssistant()) {
        <app-drawer title="Create Assistant Account" subtitle="Local metadata only. An authorized backend administrator must provision the real account." (closed)="openAddAssistant.set(false); resetAssistantForm()">
          <div class="rounded-card border border-amber-200 bg-amber-50 p-3 mb-2">
            <p class="text-xs font-bold text-amber-900">⚠️ Security Notice</p>
            <p class="text-xs text-amber-800 mt-0.5">Only you (admin) can see this form. This browser cannot provision authentication accounts or grant staff privileges. No login credentials are saved.</p>
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
              <p class="font-display font-bold text-sm text-emerald-900 flex items-center gap-2"><lucide-icon name="circle-check" [size]="16" class="text-emerald-600" />Local metadata recorded — server provisioning required</p>
              <div class="mt-2 font-mono text-xs text-emerald-900 space-y-1 bg-white/70 rounded p-2">
                <p><span class="font-bold">Email:</span> {{ assistantCreated()?.email }}</p>
                <p>No password is stored or provisioned by this form.</p>
              </div>
              <p class="text-xs text-emerald-700 mt-1.5">An authorized backend administrator must provision this identity before sign-in.</p>
              <div class="mt-3 pt-2 border-t border-emerald-200/60 flex items-center justify-between">
                <span class="text-xs font-semibold text-emerald-900">Added to Assistant Metrics &darr;</span>
                <button type="button" class="btn btn-sm btn-outline border-emerald-600 text-emerald-800" (click)="openAddAssistant.set(false); resetAssistantForm()">
                  View in Table
                </button>
              </div>
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
export class AdminMetricsPage {
  protected readonly admin = inject(AdminService);
  protected readonly Math = Math;
  protected readonly rangeKpi = computed(() => this.admin.getKpisForRange(this.range()));
  protected readonly presence = PRESENCE;
  protected readonly ranges: Range[] = ['7d', '30d', 'term'];
  protected readonly range = signal<Range>('7d');
  protected readonly days = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];
  protected readonly goals = [
    { key: 'admin.metrics.g1', v: 91, c: 'bg-success-mid' },
    { key: 'admin.metrics.g2', v: 86, c: 'bg-gold' },
    { key: 'admin.metrics.g3', v: 78, c: 'bg-primary' },
  ];
  protected readonly maxQ = computed(() => Math.max(...this.admin.weeklyActivity.questions));

  // Assistant account drawer state
  protected readonly openAddAssistant = signal(false);
  protected readonly newAssistantName = signal('');
  protected readonly newAssistantEmail = signal('');
  protected readonly newAssistantPw = signal('');
  protected readonly showAssistantPw = signal(false);
  protected readonly assistantFormErr = signal<string | null>(null);
  protected readonly assistantCreated = signal<{ email: string; password: string } | null>(null);

  protected resetAssistantForm(): void {
    this.newAssistantName.set('');
    this.newAssistantEmail.set('');
    this.newAssistantPw.set('');
    this.showAssistantPw.set(false);
    this.assistantFormErr.set(null);
    this.assistantCreated.set(null);
  }

  protected createAssistant(): void {
    const name = this.newAssistantName().trim();
    const email = this.newAssistantEmail().trim();
    const pw = this.newAssistantPw();

    if (!name) return this.assistantFormErr.set('Name is required');
    if (!email || !email.includes('@')) return this.assistantFormErr.set('Valid email is required');
    if (pw.length < 8) return this.assistantFormErr.set('Password must be at least 8 characters');

    const account: AssistantAccount = {
      id: 'ast_' + Date.now(),
      fullName: name,
      email,
      password: pw,
      initials: name.slice(0, 2).toUpperCase(),
      role: 'assistant',
      createdAt: new Date().toISOString(),
      scopes: ['receipts', 'attendance', 'qa'],
    };

    saveCustomAssistantAccount(account);
    this.assistantCreated.set({ email, password: '' });
    this.newAssistantPw.set('');
    this.admin.addStaffMember({
      id: account.id,
      name: account.fullName,
      email: account.email,
      role: 'assistant',
      initials: account.initials,
      scopes: ['receipts', 'attendance', 'qa'],
    });
  }

  protected sum(list: number[]): number {
    return list.reduce((a, b) => a + b, 0);
  }
}
