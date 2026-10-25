import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AdminService } from '../../core/data/admin.service';
import { LanguageService } from '../../core/i18n/language.service';
import { LocalizePipe, TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminPayment, PaymentRowStatus } from '../../core/models/admin';
import { AdminHeaderComponent, DrawerComponent, InitialsComponent, StatComponent } from './admin-ui';

type Tab = 'review' | 'all';
const TONE: Record<PaymentRowStatus, string> = {
  pending: 'tone-warning', approved: 'tone-success', paid: 'tone-success', rejected: 'tone-danger', failed: 'tone-danger', refunded: 'tone-neutral',
};
const METHOD_ICON: Record<string, string> = { card: 'credit-card', instapay: 'landmark', vodafone: 'smartphone', etisalat: 'smartphone' };

@Component({
  selector: 'app-admin-payments',
  imports: [FormsModule, LucideAngularModule, TranslatePipe, LocalizePipe, DatePipe, DecimalPipe, AdminHeaderComponent, StatComponent, DrawerComponent, InitialsComponent],
  template: `
    <div class="space-y-6">
      <app-admin-header [title]="'admin.pay.title' | t" [subtitle]="'admin.pay.subtitle' | t">
        <button type="button" class="btn btn-soft" (click)="exportCsv()"><lucide-icon name="download" [size]="16" />{{ 'admin.export' | t }}</button>
      </app-admin-header>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <app-stat [label]="'admin.stats.revenueOct' | t" [value]="'access.price' | t: { n: (tot.revenueOct | number) ?? '' }" icon="banknote"
          [note]="'admin.pay.paidEnrollments' | t: { n: tot.paidOct }" noteIcon="trending-up" noteClass="text-success" />
        <app-stat [label]="'admin.pay.awaiting' | t" [value]="admin.pendingCount() + ''" icon="hourglass" tone="tone-warning" [note]="'admin.pay.oldest' | t" noteIcon="clock" noteClass="text-amber" />
        <app-stat [label]="'admin.pay.failedRejected' | t" [value]="failedCount() + ''" icon="circle-x" tone="tone-danger" [note]="'admin.pay.thisMonth' | t" />
        <app-stat [label]="'admin.pay.provider' | t" [value]="'admin.pay.notSet' | t" icon="credit-card" tone="tone-neutral" valueClass="!text-ink-muted" [note]="'admin.pay.manualOnly' | t" />
      </div>

      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div class="seg" role="tablist">
          <button type="button" role="tab" [class.seg-on]="tab() === 'review'" [attr.aria-selected]="tab() === 'review'" (click)="tab.set('review')">{{ 'admin.pay.tabReview' | t: { n: admin.pendingCount() } }}</button>
          <button type="button" role="tab" [class.seg-on]="tab() === 'all'" [attr.aria-selected]="tab() === 'all'" (click)="tab.set('all')">{{ 'admin.pay.tabAll' | t }}</button>
        </div>
        <label class="relative md:w-80">
          <span class="sr-only">{{ 'admin.pay.search' | t }}</span>
          <lucide-icon name="search" [size]="16" class="input-icon start-3.5" />
          <input type="search" class="input h-10 ps-10 text-sm" [ngModel]="query()" (ngModelChange)="query.set($event)" [placeholder]="'admin.pay.search' | t" />
        </label>
      </div>

      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr><th>{{ 'admin.cols.studentItem' | t }}</th><th>{{ 'admin.cols.method' | t }}</th><th>{{ 'admin.cols.amount' | t }}</th><th>{{ 'admin.cols.submitted' | t }}</th><th>{{ 'admin.cols.status' | t }}</th><th><span class="sr-only">{{ 'admin.cols.actions' | t }}</span></th></tr>
          </thead>
          <tbody>
            @for (p of shown(); track p.id) {
              <tr [class.bg-surface-warm]="selected()?.id === p.id">
                <td>
                  <div class="flex items-center gap-3">
                    <app-initials [text]="p.initials" />
                    <div><p class="font-display font-semibold text-ink">{{ p.student }}</p><p class="text-xs text-ink-muted">{{ p.item | loc }}</p></div>
                  </div>
                </td>
                <td><span class="flex items-center gap-2 whitespace-nowrap"><lucide-icon [name]="icon[p.method]" [size]="15" class="text-ink-soft" />{{ p.methodDetail || ('pay.manual.' + p.method | t) }}</span></td>
                <td class="whitespace-nowrap font-display font-semibold text-ink">
                  {{ 'access.price' | t: { n: p.amountEgp } }}
                  @if (p.amountEgp !== p.expectedEgp) { <lucide-icon name="circle-alert" [size]="14" class="ms-1 align-[-2px] text-danger" /> }
                </td>
                <td class="whitespace-nowrap text-[0.8125rem]">{{ p.submittedAt | date: 'd MMM, h:mm a' : 'Africa/Cairo' : i18n.lang() }}</td>
                <td><span class="tag" [class]="tone[p.status]">{{ 'admin.pay.status.' + p.status | t }}</span></td>
                <td>
                  <div class="flex justify-end gap-1.5">
                    @if (p.status === 'pending') {
                      <button type="button" class="btn btn-success-soft btn-sm !px-2.5" (click)="approve(p)" [attr.aria-label]="'admin.pay.approve' | t" title="Approve & Enroll"><lucide-icon name="check" [size]="15" /></button>
                      <button type="button" class="btn btn-danger-soft btn-sm !px-2.5" (click)="quickReject(p)" [attr.aria-label]="'admin.pay.reject' | t" title="Reject Payment"><lucide-icon name="x" [size]="15" /></button>
                    }
                    <button type="button" class="btn btn-soft btn-sm !px-2.5" (click)="open(p)" [attr.aria-label]="'admin.pay.review' | t"><lucide-icon name="eye" [size]="15" /></button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="py-12 text-center">
                <lucide-icon name="circle-check" [size]="28" class="mx-auto text-success" />
                <p class="mt-2 font-display font-semibold text-ink">{{ 'admin.pay.allDone' | t }}</p>
              </td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    @if (selected(); as p) {
      <app-drawer [title]="'admin.pay.drawerTitle' | t" [subtitle]="'admin.pay.submittedOn' | t: { date: (p.submittedAt | date: 'd MMM y, h:mm a' : 'Africa/Cairo' : i18n.lang()) ?? '' }" (closed)="selectedId.set(null)">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3"><app-initials [text]="p.initials" /><div><p class="font-display font-semibold text-ink">{{ p.student }}</p><p class="text-xs text-ink-muted">{{ p.email }}</p></div></div>
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

            @if (p.receiptFiles && p.receiptFiles.length > 1) {
              <div class="flex items-center gap-2 pt-1">
                <span class="text-xs font-semibold text-ink-muted">Screenshots ({{ p.receiptFiles.length }}):</span>
                @for (file of p.receiptFiles; track file) {
                  <button type="button" (click)="selectedReceiptFile.set(file)"
                    class="h-12 w-12 overflow-hidden rounded-card border transition"
                    [class]="activeReceipt(p) === file ? 'border-primary ring-2 ring-primary/40' : 'border-line opacity-70 hover:opacity-100'">
                    <img [src]="file" alt="Thumb" class="h-full w-full object-cover" />
                  </button>
                }
              </div>
            }
          </div>
        }

        <div class="kv-box">
          <div class="kv"><span>{{ 'pay.item' | t }}</span><span>{{ p.item | loc }}</span></div>
          <div class="kv"><span>{{ 'admin.pay.expected' | t }}</span><span>{{ 'access.price' | t: { n: p.expectedEgp } }}</span></div>
          <div class="kv"><span>{{ 'admin.pay.received' | t }}</span><span [class.!text-danger]="p.amountEgp !== p.expectedEgp">{{ 'access.price' | t: { n: p.amountEgp } }}</span></div>
          <div class="kv"><span>{{ 'pay.reference' | t }}</span><span dir="ltr">{{ p.reference }}</span></div>
          @if (p.senderPhone) { <div class="kv"><span>{{ 'admin.pay.sender' | t }}</span><span dir="ltr">{{ p.senderPhone }}</span></div> }
          <div class="kv"><span>{{ 'admin.pay.duplicateCheck' | t }}</span>
            @if (p.duplicateOf) {
              <span class="tag tone-danger !font-semibold"><lucide-icon name="copy" [size]="12" />{{ 'admin.pay.usedBy' | t: { who: p.duplicateOf } }}</span>
            } @else {
              <span class="tag tone-success !font-semibold"><lucide-icon name="check" [size]="12" />{{ 'admin.pay.noMatch' | t }}</span>
            }
          </div>
        </div>

        @if (p.amountEgp !== p.expectedEgp) {
          <p class="note tone-danger"><lucide-icon name="circle-alert" [size]="16" class="mt-0.5 shrink-0" />{{ 'admin.pay.amountMismatch' | t }}</p>
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
          }
        </ng-container>
      </app-drawer>
    }
  `,
})
export class AdminPaymentsPage {
  protected readonly admin = inject(AdminService);
  protected readonly i18n = inject(LanguageService);
  protected readonly tot = this.admin.totals;
  protected readonly tone = TONE;
  protected readonly icon = METHOD_ICON;

  protected readonly tab = signal<Tab>('review');
  protected readonly query = signal('');
  protected readonly selectedId = signal<string | null>(null);
  protected readonly selected = computed(() => this.admin.payments().find((p) => p.id === this.selectedId()) ?? null);
  protected readonly note = signal('');
  protected readonly noteErr = signal(false);
  protected readonly actionError = signal<string | null>(null);

  protected readonly failedCount = computed(() => this.admin.payments().filter((p) => p.status === 'failed' || p.status === 'rejected').length);
  protected readonly shown = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.admin
      .payments()
      .filter((p) => (this.tab() === 'all' || p.status === 'pending') && (!q || p.student.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q)));
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

  protected async approve(p: AdminPayment): Promise<void> {
    const res = await this.admin.reviewReceiptRpc(p.id, 'approved');
    if (!res.success) { this.actionError.set(res.error || 'Review failed'); return; }
    this.actionError.set(null);
    this.selectedId.set(null);
  }

  protected async quickReject(p: AdminPayment): Promise<void> {
    const defaultReason = this.i18n.lang() === 'ar' ? 'بيانات التحويل غير مطابقة أو لقطة الشاشة غير واضحة' : 'Payment reference or receipt details could not be verified';
    const note = prompt(
      this.i18n.lang() === 'ar' ? 'تأكيد رفض الإيصال - سبب الرفض:' : 'Confirm Payment Rejection - Reason:',
      defaultReason
    );
    if (note !== null) {
      const res = await this.admin.reviewReceiptRpc(p.id, 'rejected', note.trim() || defaultReason);
      if (!res.success) { this.actionError.set(res.error || 'Review failed'); return; }
      this.actionError.set(null);
      if (this.selectedId() === p.id) {
        this.selectedId.set(null);
      }
    }
  }

  protected async reject(p: AdminPayment): Promise<void> {
    const defaultReason = this.i18n.lang() === 'ar' ? 'بيانات التحويل غير مطابقة أو لقطة الشاشة غير واضحة' : 'Payment reference or receipt details could not be verified';
    const finalNote = this.note().trim() || defaultReason;
    const res = await this.admin.reviewReceiptRpc(p.id, 'rejected', finalNote);
    if (!res.success) { this.actionError.set(res.error || 'Review failed'); return; }
    this.actionError.set(null);
    this.selectedId.set(null);
  }

  protected exportCsv(): void {
    const rows = [
      ['Student', 'Email', 'Method', 'Amount (EGP)', 'Status', 'Reference', 'Date'],
      ...this.admin.payments().map((p) => [
        p.student,
        p.email || '',
        p.method,
        p.amountEgp,
        p.status,
        p.reference,
        p.submittedAt,
      ]),
    ];
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'payments.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
