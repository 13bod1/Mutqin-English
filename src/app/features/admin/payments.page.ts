import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AdminService } from '../../core/data/admin.service';
import { AuthService } from '../../core/data/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { LocalizePipe, TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminPayment, PaymentRowStatus } from '../../core/models/admin';
import { RefundRecord, RefundStatus } from '../../core/models/sprint3';
import { PaymentReconciliationService } from '../../core/services/payment-reconciliation.service';
import { AdminHeaderComponent, DrawerComponent, InitialsComponent, StatComponent } from './admin-ui';

type Tab = 'review' | 'all' | 'reconciliation';

const TONE: Record<PaymentRowStatus, string> = {
  pending: 'tone-warning',
  approved: 'tone-success',
  paid: 'tone-success',
  rejected: 'tone-danger',
  failed: 'tone-danger',
  refunded: 'tone-neutral',
};

const METHOD_ICON: Record<string, string> = {
  card: 'credit-card',
  instapay: 'landmark',
  vodafone: 'smartphone',
  etisalat: 'smartphone',
};

@Component({
  selector: 'app-admin-payments',
  imports: [
    FormsModule,
    LucideAngularModule,
    TranslatePipe,
    LocalizePipe,
    DatePipe,
    DecimalPipe,
    AdminHeaderComponent,
    StatComponent,
    DrawerComponent,
    InitialsComponent,
  ],
  template: `
    <div class="space-y-6">
      <app-admin-header [title]="'admin.pay.title' | t" [subtitle]="'admin.pay.subtitle' | t">
        <div class="flex items-center gap-2">
          <button type="button" class="btn btn-primary" (click)="exportReconciliationCsv()">
            <lucide-icon name="file-spreadsheet" [size]="16" />{{ 'reconciliation.exportCsv' | t }}
          </button>
        </div>
      </app-admin-header>

      <!-- KPI Summary Cards -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        @if (canViewRevenue()) {
          <app-stat
            [label]="'reconciliation.summaryCards.totalCollected' | t"
            [value]="'access.price' | t: { n: (reconciliationSummary().totalCollectedEgp | number) ?? '' }"
            icon="banknote"
            [note]="'admin.pay.paidEnrollments' | t: { n: tot.paidOct }"
            noteIcon="trending-up"
            noteClass="text-success"
          />
          <app-stat
            [label]="'reconciliation.summaryCards.totalRefunded' | t"
            [value]="'access.price' | t: { n: (reconciliationSummary().totalRefundedEgp | number) ?? '' }"
            icon="rotate-ccw"
            tone="tone-neutral"
            [note]="refunds().length + ' refunds processed'"
          />
          <app-stat
            [label]="'reconciliation.summaryCards.netRevenue' | t"
            [value]="'access.price' | t: { n: (reconciliationSummary().netRevenueEgp | number) ?? '' }"
            icon="landmark"
            tone="tone-gold"
            [note]="'After approved refunds'"
          />
        } @else {
          <!-- Assistant Role View: Revenue numbers are redacted/masked per acceptance criteria -->
          <div class="stat-card col-span-1 sm:col-span-2 xl:col-span-3 bg-surface-warm/50 border border-line p-4">
            <div class="flex items-center gap-2 text-ink-muted">
              <lucide-icon name="shield" [size]="18" class="text-primary" />
              <p class="font-display text-xs font-semibold">{{ 'reconciliation.assistantRevenueHidden' | t }}</p>
            </div>
            <p class="mt-2 text-xs text-ink-body">
              Assistant operators can review transaction legitimacy, receipts, and refund requests, but net platform balances are restricted.
            </p>
          </div>
        }

        <app-stat
          [label]="'reconciliation.summaryCards.mismatchesCount' | t"
          [value]="reconciliationSummary().mismatches.length + ''"
          icon="triangle-alert"
          tone="tone-danger"
          [note]="'Gateway discrepancies'"
          noteClass="text-danger"
        />
      </div>

      <!-- Tab Switcher -->
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div class="seg" role="tablist">
          <button
            type="button"
            role="tab"
            [class.seg-on]="tab() === 'review'"
            [attr.aria-selected]="tab() === 'review'"
            (click)="tab.set('review')"
          >{{ 'admin.pay.tabReview' | t: { n: admin.pendingCount() } }}</button>
          <button
            type="button"
            role="tab"
            [class.seg-on]="tab() === 'all'"
            [attr.aria-selected]="tab() === 'all'"
            (click)="tab.set('all')"
          >{{ 'admin.pay.tabAll' | t }}</button>
          <button
            type="button"
            role="tab"
            [class.seg-on]="tab() === 'reconciliation'"
            [attr.aria-selected]="tab() === 'reconciliation'"
            (click)="tab.set('reconciliation')"
          >
            <lucide-icon name="scale" [size]="14" class="me-1 inline" />
            {{ 'reconciliation.title' | t }}
          </button>
        </div>

        <label class="relative md:w-80">
          <span class="sr-only">{{ 'admin.pay.search' | t }}</span>
          <lucide-icon name="search" [size]="16" class="input-icon start-3.5" />
          <input
            type="search"
            class="input h-10 ps-10 text-sm"
            [ngModel]="query()"
            (ngModelChange)="query.set($event)"
            [placeholder]="'admin.pay.search' | t"
          />
        </label>
      </div>

      <!-- Tab 1 & 2: Payments Review / All -->
      @if (tab() !== 'reconciliation') {
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>{{ 'admin.cols.studentItem' | t }}</th>
                <th>{{ 'admin.cols.method' | t }}</th>
                <th>{{ 'admin.cols.amount' | t }}</th>
                <th>{{ 'admin.cols.submitted' | t }}</th>
                <th>{{ 'admin.cols.status' | t }}</th>
                <th><span class="sr-only">{{ 'admin.cols.actions' | t }}</span></th>
              </tr>
            </thead>
            <tbody>
              @for (p of shown(); track p.id) {
                <tr [class.bg-surface-warm]="selected()?.id === p.id">
                  <td>
                    <div class="flex items-center gap-3">
                      <app-initials [text]="p.initials" />
                      <div>
                        <p class="font-display font-semibold text-ink">{{ p.student }}</p>
                        <p class="text-xs text-ink-muted">{{ p.item | loc }}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="flex items-center gap-2 whitespace-nowrap">
                      <lucide-icon [name]="icon[p.method] || 'credit-card'" [size]="15" class="text-ink-soft" />
                      {{ p.methodDetail || ('pay.manual.' + p.method | t) }}
                    </span>
                  </td>
                  <td class="whitespace-nowrap font-display font-semibold text-ink">
                    {{ 'access.price' | t: { n: p.amountEgp } }}
                    @if (p.amountEgp !== p.expectedEgp) {
                      <span class="ms-1 inline-flex items-center text-xs text-danger" title="Amount mismatch with course fee">
                        <lucide-icon name="circle-alert" [size]="14" />
                      </span>
                    }
                  </td>
                  <td class="whitespace-nowrap text-[0.8125rem]">
                    {{ p.submittedAt | date: 'd MMM, h:mm a' : 'Africa/Cairo' : i18n.lang() }}
                  </td>
                  <td>
                    <span class="tag" [class]="tone[p.status]">{{ 'admin.pay.status.' + p.status | t }}</span>
                  </td>
                  <td>
                    <div class="flex justify-end gap-1.5">
                      @if (p.status === 'pending') {
                        <button
                          type="button"
                          class="btn btn-success-soft btn-sm !px-2.5"
                          (click)="admin.approve(p.id)"
                          [attr.aria-label]="'admin.pay.approve' | t"
                          title="Approve & Enroll"
                        >
                          <lucide-icon name="check" [size]="15" />
                        </button>
                        <button
                          type="button"
                          class="btn btn-danger-soft btn-sm !px-2.5"
                          (click)="quickReject(p)"
                          [attr.aria-label]="'admin.pay.reject' | t"
                          title="Reject Payment"
                        >
                          <lucide-icon name="x" [size]="15" />
                        </button>
                      }
                      @if (p.status === 'paid' || p.status === 'approved') {
                        <button
                          type="button"
                          class="btn btn-soft btn-sm !px-2.5 text-ink-muted hover:text-amber"
                          (click)="initiateRefund(p)"
                          title="Request Refund"
                        >
                          <lucide-icon name="rotate-ccw" [size]="14" />
                        </button>
                      }
                      <button
                        type="button"
                        class="btn btn-soft btn-sm !px-2.5"
                        (click)="open(p)"
                        [attr.aria-label]="'admin.pay.review' | t"
                      >
                        <lucide-icon name="eye" [size]="15" />
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="py-12 text-center">
                    <lucide-icon name="circle-check" [size]="28" class="mx-auto text-success" />
                    <p class="mt-2 font-display font-semibold text-ink">{{ 'admin.pay.allDone' | t }}</p>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <!-- Tab 3: Payment Reconciliation & Gateway Mismatches -->
        <div class="space-y-6">
          <!-- Gateway Discrepancies Alert Table -->
          @if (reconciliationSummary().mismatches.length > 0) {
            <div class="rounded-card-lg border border-danger/30 bg-danger/5 p-5">
              <div class="flex items-center gap-2 font-display text-sm font-bold text-danger">
                <lucide-icon name="triangle-alert" [size]="18" />
                <span>{{ 'reconciliation.mismatchDetected' | t }} ({{ reconciliationSummary().mismatches.length }})</span>
              </div>
              <p class="mt-1 text-xs text-ink-body">
                The following transactions have discrepancies between customer transfer amounts and expected course fees, or flagged duplicate references.
              </p>
              <div class="mt-3 table-wrap">
                <table class="table text-xs">
                  <thead>
                    <tr>
                      <th>Payment ID</th>
                      <th>Student</th>
                      <th>Method</th>
                      <th>Reported EGP</th>
                      <th>Expected Gateway EGP</th>
                      <th>Issue Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (m of reconciliationSummary().mismatches; track m.paymentId) {
                      <tr>
                        <td class="font-mono font-bold">{{ m.paymentId }}</td>
                        <td>{{ m.studentName }}</td>
                        <td>{{ m.method }}</td>
                        <td class="font-bold text-danger">{{ m.reportedEgp }} EGP</td>
                        <td class="font-bold">{{ m.gatewayEgp }} EGP</td>
                        <td class="text-danger font-medium">{{ m.issue }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- Method Breakdown Grid -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="card p-4">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-ink-muted">Credit / Debit Cards</span>
                <lucide-icon name="credit-card" [size]="18" class="text-primary" />
              </div>
              <p class="mt-2 font-display text-xl font-bold">{{ reconciliationSummary().byMethod.card.count }} transactions</p>
              @if (canViewRevenue()) {
                <p class="text-xs font-semibold text-success mt-1">{{ reconciliationSummary().byMethod.card.totalEgp }} EGP settled</p>
              }
            </div>
            <div class="card p-4">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-ink-muted">InstaPay Transfers</span>
                <lucide-icon name="landmark" [size]="18" class="text-primary" />
              </div>
              <p class="mt-2 font-display text-xl font-bold">{{ reconciliationSummary().byMethod.instapay.count }} transactions</p>
              @if (canViewRevenue()) {
                <p class="text-xs font-semibold text-success mt-1">{{ reconciliationSummary().byMethod.instapay.totalEgp }} EGP settled</p>
              }
            </div>
            <div class="card p-4">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-ink-muted">Vodafone Cash</span>
                <lucide-icon name="smartphone" [size]="18" class="text-primary" />
              </div>
              <p class="mt-2 font-display text-xl font-bold">{{ reconciliationSummary().byMethod.vodafone.count }} transactions</p>
              @if (canViewRevenue()) {
                <p class="text-xs font-semibold text-success mt-1">{{ reconciliationSummary().byMethod.vodafone.totalEgp }} EGP settled</p>
              }
            </div>
            <div class="card p-4">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-ink-muted">Etisalat Cash</span>
                <lucide-icon name="smartphone" [size]="18" class="text-primary" />
              </div>
              <p class="mt-2 font-display text-xl font-bold">{{ reconciliationSummary().byMethod.etisalat.count }} transactions</p>
              @if (canViewRevenue()) {
                <p class="text-xs font-semibold text-success mt-1">{{ reconciliationSummary().byMethod.etisalat.totalEgp }} EGP settled</p>
              }
            </div>
          </div>

          <!-- Refund Records Section -->
          <div class="card p-5">
            <div class="flex items-center justify-between border-b border-line pb-3">
              <div class="flex items-center gap-2">
                <lucide-icon name="rotate-ccw" [size]="18" class="text-primary" />
                <h3 class="font-display text-sm font-bold">{{ 'reconciliation.refundsTab' | t }}</h3>
              </div>
              <span class="tag tone-neutral text-xs">{{ refunds().length }} records</span>
            </div>

            <div class="mt-4 table-wrap">
              <table class="table text-xs">
                <thead>
                  <tr>
                    <th>Refund ID</th>
                    <th>Payment ID</th>
                    <th>Student</th>
                    <th>Amount</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of refunds(); track r.id) {
                    <tr>
                      <td class="font-mono">{{ r.id }}</td>
                      <td class="font-mono font-bold">{{ r.paymentId }}</td>
                      <td>{{ r.studentName }}</td>
                      <td class="font-bold">{{ r.amountEgp }} EGP</td>
                      <td class="max-w-xs truncate">{{ r.reason }}</td>
                      <td>
                        <span class="tag" [class]="r.status === 'refunded' ? 'tone-neutral' : r.status === 'approved' ? 'tone-success' : r.status === 'rejected' ? 'tone-danger' : 'tone-warning'">
                          {{ 'reconciliation.refundStatus.' + r.status | t }}
                        </span>
                      </td>
                      <td>
                        @if (r.status === 'requested') {
                          <div class="flex gap-1">
                            <button
                              type="button"
                              (click)="updateRefund(r.id, 'approved')"
                              class="rounded bg-emerald-600/15 px-2 py-1 font-bold text-emerald-700 hover:bg-emerald-600/25"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              (click)="updateRefund(r.id, 'rejected')"
                              class="rounded bg-red-600/15 px-2 py-1 font-bold text-red-700 hover:bg-red-600/25"
                            >
                              Reject
                            </button>
                          </div>
                        } @else if (r.status === 'approved') {
                          <button
                            type="button"
                            (click)="updateRefund(r.id, 'refunded')"
                            class="rounded bg-primary/15 px-2 py-1 font-bold text-primary hover:bg-primary/25"
                          >
                            Mark Refunded
                          </button>
                        } @else {
                          <span class="text-ink-muted">Completed</span>
                        }
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="7" class="py-6 text-center text-ink-muted">No refund requests found.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }
    </div>

    <!-- Review Drawer -->
    @if (selected(); as p) {
      <app-drawer
        [title]="'admin.pay.drawerTitle' | t"
        [subtitle]="'admin.pay.submittedOn' | t: { date: (p.submittedAt | date: 'd MMM y, h:mm a' : 'Africa/Cairo' : i18n.lang()) ?? '' }"
        (closed)="selectedId.set(null)"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <app-initials [text]="p.initials" />
            <div>
              <p class="font-display font-semibold text-ink">{{ p.student }}</p>
              <p class="text-xs text-ink-muted">{{ p.email }}</p>
            </div>
          </div>
          <span class="tag" [class]="tone[p.status]">{{ 'admin.pay.status.' + p.status | t }}</span>
        </div>

        @if (activeReceipt(p); as curFile) {
          <div class="space-y-3">
            <div class="group relative overflow-hidden rounded-card-lg border border-line bg-surface-page shadow-sm">
              @if (isImage(curFile)) {
                <a [href]="curFile" target="_blank" class="block max-h-96 overflow-hidden bg-black/5 text-center cursor-zoom-in">
                  <img [src]="curFile" [alt]="p.student + ' receipt'" class="mx-auto max-h-96 w-auto object-contain transition duration-200 group-hover:scale-[1.02]" />
                </a>
              } @else {
                <div class="flex h-52 flex-col items-center justify-center gap-2.5 bg-surface-tint2">
                  <lucide-icon [name]="curFile.endsWith('.pdf') ? 'file-text' : 'image'" [size]="42" class="text-primary-light" />
                  <p class="text-[0.8125rem] font-medium text-ink-muted" dir="ltr">{{ curFile }}</p>
                </div>
              }
              <div class="flex items-center justify-between border-t border-line/60 bg-surface-tint px-3.5 py-2.5">
                <span class="truncate text-xs font-mono text-ink-muted" dir="ltr">{{ curFile }}</span>
                <a [href]="curFile" target="_blank" class="btn btn-soft btn-sm inline-flex items-center gap-1.5 shrink-0">
                  <lucide-icon name="maximize" [size]="14" />{{ 'admin.pay.fullSize' | t }}
                </a>
              </div>
            </div>
          </div>
        }

        @if (p.status === 'pending') {
          <label class="block">
            <span class="field-label">{{ 'admin.pay.note' | t }}</span>
            <textarea rows="3" class="input input-plain h-auto py-3" [ngModel]="note()" (ngModelChange)="note.set($event)" [placeholder]="'admin.pay.notePh' | t"></textarea>
            @if (noteErr()) { <span class="field-error"><lucide-icon name="circle-alert" [size]="14" />{{ 'admin.pay.noteRequired' | t }}</span> }
          </label>
        } @else if (p.note) {
          <p class="note tone-brand"><lucide-icon name="message-square" [size]="16" class="mt-0.5 shrink-0" />{{ p.note }}</p>
        }

        <ng-container ngProjectAs="[footer]">
          @if (p.status === 'pending') {
            <button type="button" class="btn btn-danger-soft btn-lg flex-1" (click)="reject(p)"><lucide-icon name="x" [size]="16" />{{ 'admin.pay.reject' | t }}</button>
            <button type="button" class="btn btn-success btn-lg flex-1" (click)="approve(p)"><lucide-icon name="check" [size]="16" />{{ 'admin.pay.approveEnroll' | t }}</button>
          } @else if (p.status === 'paid' || p.status === 'approved') {
            <button type="button" class="btn btn-soft btn-lg flex-1 text-danger" (click)="initiateRefund(p)">
              <lucide-icon name="rotate-ccw" [size]="16" />{{ 'reconciliation.requestRefundBtn' | t }}
            </button>
          }
        </ng-container>
      </app-drawer>
    }
  `,
})
export class AdminPaymentsPage {
  protected readonly admin = inject(AdminService);
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(LanguageService);
  protected readonly reconciliation = inject(PaymentReconciliationService);

  protected readonly tot = this.admin.totals;
  protected readonly tone = TONE;
  protected readonly icon = METHOD_ICON;

  protected readonly tab = signal<Tab>('review');
  protected readonly query = signal('');
  protected readonly selectedId = signal<string | null>(null);
  protected readonly selected = computed(() => this.admin.payments().find((p) => p.id === this.selectedId()) ?? null);
  protected readonly note = signal('');
  protected readonly noteErr = signal(false);

  // Assistant revenue masking rule: assistant cannot see revenue
  protected readonly canViewRevenue = computed(() => {
    const role = this.auth.user()?.role;
    return role === 'admin';
  });

  protected readonly failedCount = computed(
    () => this.admin.payments().filter((p) => p.status === 'failed' || p.status === 'rejected').length
  );

  protected readonly reconciliationSummary = computed(() => {
    const role = this.auth.user()?.role || 'admin';
    return this.reconciliation.getReconciliationSummary(role, this.admin.payments());
  });

  protected readonly refunds = computed(() => {
    let list: RefundRecord[] = [];
    this.reconciliation.refunds$.subscribe((l) => (list = l));
    return list;
  });

  protected readonly shown = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.admin
      .payments()
      .filter(
        (p) =>
          (this.tab() === 'all' || p.status === 'pending') &&
          (!q || p.student.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q))
      );
  });

  protected readonly selectedReceiptFile = signal<string | null>(null);

  protected activeReceipt(p: AdminPayment): string | null {
    const override = this.selectedReceiptFile();
    if (override && p.receiptFiles?.includes(override)) return override;
    return p.receiptFile || p.receiptFiles?.[0] || null;
  }

  protected isImage(file: string): boolean {
    return /\.(png|jpe?g|webp|gif|svg)$/i.test(file);
  }

  protected open(p: AdminPayment): void {
    this.note.set('');
    this.noteErr.set(false);
    this.selectedReceiptFile.set(p.receiptFile || p.receiptFiles?.[0] || null);
    this.selectedId.set(p.id);
  }

  protected approve(p: AdminPayment): void {
    this.admin.approve(p.id);
    this.selectedId.set(null);
  }

  protected quickReject(p: AdminPayment): void {
    const defaultReason =
      this.i18n.lang() === 'ar'
        ? 'بيانات التحويل غير مطابقة أو لقطة الشاشة غير واضحة'
        : 'Payment reference or receipt details could not be verified';
    const note = prompt(
      this.i18n.lang() === 'ar' ? 'تأكيد رفض الإيصال - سبب الرفض:' : 'Confirm Payment Rejection - Reason:',
      defaultReason
    );
    if (note !== null) {
      this.admin.reject(p.id, note.trim() || defaultReason);
      if (this.selectedId() === p.id) {
        this.selectedId.set(null);
      }
    }
  }

  protected reject(p: AdminPayment): void {
    const defaultReason =
      this.i18n.lang() === 'ar'
        ? 'بيانات التحويل غير مطابقة أو لقطة الشاشة غير واضحة'
        : 'Payment reference or receipt details could not be verified';
    const finalNote = this.note().trim() || defaultReason;
    this.admin.reject(p.id, finalNote);
    this.selectedId.set(null);
  }

  protected initiateRefund(p: AdminPayment): void {
    const reason = prompt('Please enter refund reason:', 'Customer requested cancellation or amount discrepancy.');
    if (!reason) return;

    const staffName = this.auth.user()?.fullName || 'Staff Member';
    const res = this.reconciliation.requestRefund(p, staffName, reason);
    if (!res.success) {
      alert(res.error);
    } else {
      alert('Refund request submitted successfully.');
      this.tab.set('reconciliation');
    }
  }

  protected updateRefund(refundId: string, status: RefundStatus): void {
    const staffName = this.auth.user()?.fullName || 'Admin';
    const res = this.reconciliation.transitionRefundStatus(refundId, status, staffName);
    if (!res.success) {
      alert(res.error);
    }
  }

  protected exportReconciliationCsv(): void {
    const csvContent = this.reconciliation.exportCsv(this.admin.payments());
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `payment-reconciliation-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
