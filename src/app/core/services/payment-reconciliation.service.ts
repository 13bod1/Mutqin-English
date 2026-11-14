import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { PAYMENTS_MOCK } from '../mock/admin.mock';
import { AdminPayment } from '../models/admin';
import { PaymentReconciliationSummary, RefundRecord, RefundStatus } from '../models/sprint3';

@Injectable({
  providedIn: 'root',
})
export class PaymentReconciliationService {
  private readonly refundsSubject = new BehaviorSubject<RefundRecord[]>([]);
  readonly refunds$ = this.refundsSubject.asObservable();

  constructor() {
    this.seedRefunds();
  }

  private seedRefunds(): void {
    const initial: RefundRecord[] = [
      {
        id: 'rf_1',
        paymentId: 'p6',
        studentName: 'Habiba Mahmoud',
        amountEgp: 300,
        paymentMethod: 'vodafone',
        status: 'refunded',
        requestedBy: 'Habiba Mahmoud',
        approvedBy: 'Mr. Adel Mostafa',
        reason: 'Payment rejected due to amount mismatch with session fee; refunded to Vodafone Cash wallet.',
        createdAt: '2026-10-21T15:00:00Z',
        updatedAt: '2026-10-21T16:30:00Z',
      },
    ];
    this.refundsSubject.next(initial);
  }

  /**
   * Generates reconciliation summary report.
   * Compares recorded transactions with expected gateway settlements and identifies discrepancies.
   * If role is 'assistant', financial revenue totals are omitted (assistant cannot see revenue).
   */
  getReconciliationSummary(
    userRole: string,
    payments: AdminPayment[] = PAYMENTS_MOCK
  ): PaymentReconciliationSummary {
    const canSeeRevenue = userRole === 'owner' || userRole === 'admin';

    let totalCollected = 0;
    let totalRefunded = 0;
    const refunds = this.refundsSubject.getValue();

    const byMethod = {
      card: { count: 0, totalEgp: 0 },
      instapay: { count: 0, totalEgp: 0 },
      vodafone: { count: 0, totalEgp: 0 },
      etisalat: { count: 0, totalEgp: 0 },
    };

    const mismatches: PaymentReconciliationSummary['mismatches'] = [];

    payments.forEach((p) => {
      const amount = p.amountEgp || 0;
      const expected = p.expectedEgp || amount;
      const method = (p.method || 'card') as 'card' | 'instapay' | 'vodafone' | 'etisalat';

      if (byMethod[method]) {
        byMethod[method].count += 1;
        if (p.status === 'paid' || p.status === 'approved') {
          byMethod[method].totalEgp += amount;
          totalCollected += amount;
        }
      }

      // Check for discrepancies / mismatches with payment gateway
      if (p.expectedEgp && p.amountEgp !== p.expectedEgp) {
        mismatches.push({
          paymentId: p.id,
          studentName: p.student,
          method: p.method,
          reportedEgp: p.amountEgp,
          gatewayEgp: p.expectedEgp,
          issue: `Underpaid: received ${p.amountEgp} EGP, course fee is ${p.expectedEgp} EGP.`,
        });
      } else if (p.duplicateOf) {
        mismatches.push({
          paymentId: p.id,
          studentName: p.student,
          method: p.method,
          reportedEgp: p.amountEgp,
          gatewayEgp: expected,
          issue: `Suspected duplicate transfer reference matching ${p.duplicateOf}.`,
        });
      }
    });

    refunds.forEach((r) => {
      if (r.status === 'refunded') {
        totalRefunded += r.amountEgp;
      }
    });

    return {
      period: 'October - November 2026',
      totalTransactions: payments.length,
      // If assistant, redact revenue numbers
      totalCollectedEgp: canSeeRevenue ? totalCollected : 0,
      totalRefundedEgp: canSeeRevenue ? totalRefunded : 0,
      netRevenueEgp: canSeeRevenue ? totalCollected - totalRefunded : 0,
      byMethod: canSeeRevenue
        ? byMethod
        : {
            card: { count: byMethod.card.count, totalEgp: 0 },
            instapay: { count: byMethod.instapay.count, totalEgp: 0 },
            vodafone: { count: byMethod.vodafone.count, totalEgp: 0 },
            etisalat: { count: byMethod.etisalat.count, totalEgp: 0 },
          },
      mismatches,
    };
  }

  /**
   * Request a refund for a payment.
   * Acceptance Criteria: A payment cannot be refunded twice.
   */
  requestRefund(
    payment: AdminPayment,
    requestedBy: string,
    reason: string
  ): { success: boolean; error?: string; refund?: RefundRecord } {
    const existing = this.refundsSubject
      .getValue()
      .find((r) => r.paymentId === payment.id && r.status !== 'rejected');

    if (existing) {
      return {
        success: false,
        error: `A refund has already been ${existing.status} for payment #${payment.id}. Double refunds are prevented.`,
      };
    }

    const refund: RefundRecord = {
      id: 'rf_' + Math.random().toString(36).substring(2, 9),
      paymentId: payment.id,
      studentName: payment.student,
      amountEgp: payment.amountEgp,
      paymentMethod: payment.method,
      status: 'requested',
      requestedBy,
      reason,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [refund, ...this.refundsSubject.getValue()];
    this.refundsSubject.next(updated);

    return { success: true, refund };
  }

  /**
   * Transition refund status: requested -> approved -> refunded or rejected.
   */
  transitionRefundStatus(
    refundId: string,
    newStatus: RefundStatus,
    staffName: string
  ): { success: boolean; error?: string } {
    const current = this.refundsSubject.getValue();
    const refund = current.find((r) => r.id === refundId);

    if (!refund) {
      return { success: false, error: 'Refund record not found.' };
    }

    if (refund.status === 'refunded') {
      return { success: false, error: 'Cannot alter a refund that is already completed.' };
    }

    refund.status = newStatus;
    refund.updatedAt = new Date().toISOString();
    if (newStatus === 'approved' || newStatus === 'refunded') {
      refund.approvedBy = staffName;
    }

    this.refundsSubject.next([...current]);
    return { success: true };
  }

  /**
   * Exports reconciliation data into a standard RFC-4180 CSV string.
   */
  exportCsv(payments: AdminPayment[] = PAYMENTS_MOCK): string {
    const headers = [
      'Payment ID',
      'Student Name',
      'Email',
      'Payment Method',
      'Status',
      'Amount (EGP)',
      'Expected (EGP)',
      'Gateway Reference',
      'Submitted Date',
    ];

    const rows = payments.map((p) => [
      `"${p.id}"`,
      `"${p.student}"`,
      `"${p.email}"`,
      `"${p.method}"`,
      `"${p.status}"`,
      p.amountEgp,
      p.expectedEgp || p.amountEgp,
      `"${p.reference || ''}"`,
      `"${p.submittedAt}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  }
}
