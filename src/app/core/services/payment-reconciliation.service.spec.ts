import { TestBed } from '@angular/core/testing';
import { PAYMENTS_MOCK } from '../mock/admin.mock';
import { AdminPayment } from '../models/admin';
import { PaymentReconciliationService } from './payment-reconciliation.service';

describe('PaymentReconciliationService (PBI-20 / AG-48 & AG-115)', () => {
  let service: PaymentReconciliationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PaymentReconciliationService],
    });
    service = TestBed.inject(PaymentReconciliationService);
  });

  describe('Reconciliation Summary & Gateway Mismatches (AG-112)', () => {
    it('TC-REC-01: should calculate totals aggregated per payment method for admin role', () => {
      const summary = service.getReconciliationSummary('admin', PAYMENTS_MOCK);

      expect(summary.totalTransactions).toBe(PAYMENTS_MOCK.length);
      expect(summary.totalCollectedEgp).toBeGreaterThan(0);
      expect(summary.byMethod.card.count).toBeGreaterThan(0);
      expect(summary.byMethod.instapay.count).toBeGreaterThan(0);
      expect(summary.byMethod.etisalat.count).toBeGreaterThan(0);
    });

    it('TC-REC-02: should identify and highlight payment gateway mismatches', () => {
      const summary = service.getReconciliationSummary('admin', PAYMENTS_MOCK);

      // p3 has amount 150 vs expected 200, p8 has duplicate reference
      expect(summary.mismatches.length).toBeGreaterThan(0);
      const underpaid = summary.mismatches.find((m) => m.paymentId === 'p3');
      expect(underpaid).toBeDefined();
      expect(underpaid?.issue).toContain('Underpaid');
    });

    it('TC-REC-03: assistant role cannot see revenue totals (masked to 0)', () => {
      const summary = service.getReconciliationSummary('assistant', PAYMENTS_MOCK);

      expect(summary.totalCollectedEgp).toBe(0);
      expect(summary.totalRefundedEgp).toBe(0);
      expect(summary.netRevenueEgp).toBe(0);
      expect(summary.byMethod.card.totalEgp).toBe(0);
      // Transactions count is still visible for auditing
      expect(summary.totalTransactions).toBe(PAYMENTS_MOCK.length);
    });
  });

  describe('Refund Records & Double Refund Prevention (AG-113)', () => {
    const mockPayment: AdminPayment = {
      id: 'p_test_refund',
      student: 'Test Student',
      initials: 'TS',
      email: 'test@student.com',
      kind: 'live',
      item: { en: 'Live Test', ar: 'لايف تجريبي' },
      method: 'card',
      amountEgp: 350,
      expectedEgp: 350,
      submittedAt: new Date().toISOString(),
      status: 'paid',
      reference: 'REF-TEST-001',
    };

    it('TC-REC-04: should request refund and create record with requested status', () => {
      const res = service.requestRefund(mockPayment, 'Admin Staff', 'Customer schedule conflict');

      expect(res.success).toBeTrue();
      expect(res.refund).toBeDefined();
      expect(res.refund?.status).toBe('requested');
      expect(res.refund?.amountEgp).toBe(350);
    });

    it('TC-REC-05: should transition refund status from requested to approved to refunded', () => {
      const res = service.requestRefund(
        { ...mockPayment, id: 'p_flow_test' },
        'Staff',
        'Valid reason'
      );
      const refundId = res.refund!.id;

      // Approve
      const appRes = service.transitionRefundStatus(refundId, 'approved', 'Mr. Adel Mostafa');
      expect(appRes.success).toBeTrue();

      // Refunded
      const refRes = service.transitionRefundStatus(refundId, 'refunded', 'Payment Gateway');
      expect(refRes.success).toBeTrue();
    });

    it('TC-REC-06: should prevent double refund on the same payment', () => {
      const first = service.requestRefund(
        { ...mockPayment, id: 'p_double_block' },
        'Staff',
        'First request'
      );
      expect(first.success).toBeTrue();

      // Second request on the same payment must fail
      const second = service.requestRefund(
        { ...mockPayment, id: 'p_double_block' },
        'Staff',
        'Duplicate request'
      );
      expect(second.success).toBeFalse();
      expect(second.error).toContain('Double refunds are prevented');
    });
  });

  describe('CSV Export (AG-114)', () => {
    it('TC-REC-07: should format CSV with headers, payment IDs, and amounts', () => {
      const csv = service.exportCsv(PAYMENTS_MOCK);

      expect(csv).toContain('Payment ID');
      expect(csv).toContain('Student Name');
      expect(csv).toContain('Amount (EGP)');
      expect(csv).toContain('p1');
      expect(csv).toContain('Mariam Ali');
    });
  });
});
