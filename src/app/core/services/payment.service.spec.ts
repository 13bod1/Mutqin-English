import { TestBed } from '@angular/core/testing';
import { PaymentService, PaymentSession, WebhookPayload } from './payment.service';

describe('PaymentService (QA Automated Test Suite - AG-67 & AG-68)', () => {
  let service: PaymentService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PaymentService);
    service.resetState();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Checkout Lifecycle & State Machine (AG-67)', () => {
    it('TC-PAY-01: should initiate a checkout session with pending status and 15-minute expiration', (done) => {
      service.createCheckoutSession('student_001', 'lec_101', 250).subscribe((session) => {
        expect(session).toBeTruthy();
        expect(session.status).toBe('pending');
        expect(session.amount).toBe(250);
        expect(session.currency).toBe('EGP');
        expect(session.expiresAt.getTime()).toBeGreaterThan(session.createdAt.getTime());
        done();
      });
    });

    it('TC-PAY-02: should successfully process valid payment and activate the session', (done) => {
      service.createCheckoutSession('student_002', 'lec_102', 300).subscribe((session) => {
        service.processCheckout(session.id).subscribe((completed) => {
          expect(completed.status).toBe('success');
          expect(completed.activatedAt).toBeDefined();
          expect(service.isLectureActivatedForStudent('student_002', 'lec_102')).toBeTrue();
          done();
        });
      });
    });

    it('TC-PAY-03: should transition to failed status when card is declined and increment retry count', (done) => {
      service.createCheckoutSession('student_003', 'lec_103', 200).subscribe((session) => {
        service.processCheckout(session.id, true, false).subscribe((failed) => {
          expect(failed.status).toBe('failed');
          expect(failed.retryCount).toBe(1);
          expect(failed.failureReason).toContain('declined');
          expect(service.isLectureActivatedForStudent('student_003', 'lec_103')).toBeFalse();
          done();
        });
      });
    });

    it('TC-PAY-04: should handle user payment cancellation cleanly', (done) => {
      service.createCheckoutSession('student_004', 'lec_104', 200).subscribe((session) => {
        service.processCheckout(session.id, false, true).subscribe((cancelled) => {
          expect(cancelled.status).toBe('cancelled');
          expect(cancelled.failureReason).toContain('cancelled by user');
          done();
        });
      });
    });

    it('TC-PAY-05: should mark session as expired if payment is processed past the expiration window', (done) => {
      service.createCheckoutSession('student_005', 'lec_105', 200).subscribe((session) => {
        // Fast-forward session expiration
        session.expiresAt = new Date(Date.now() - 1000);
        service.processCheckout(session.id).subscribe((expired) => {
          expect(expired.status).toBe('expired');
          expect(expired.failureReason).toContain('expired');
          done();
        });
      });
    });

    it('TC-PAY-06: should prevent creating new session if student already owns active session (duplicate prevention)', (done) => {
      service.createCheckoutSession('student_006', 'lec_106', 200).subscribe((session) => {
        service.processCheckout(session.id).subscribe(() => {
          // Attempt creating second checkout for same lecture
          service.createCheckoutSession('student_006', 'lec_106', 200).subscribe((secondSession) => {
            expect(secondSession.status).toBe('duplicate');
            expect(secondSession.failureReason).toContain('already active');
            done();
          });
        });
      });
    });
  });

  describe('Webhook Security & Idempotency Checks (AG-68)', () => {
    it('TC-SEC-01: should reject tampered or unsigned webhook requests (invalid signature)', () => {
      const payload: WebhookPayload = {
        eventId: 'evt_99901',
        paymentId: 'pay_99901',
        lectureId: 'lec_sec_01',
        studentId: 'student_sec_01',
        status: 'paid',
        timestamp: Date.now(),
        signature: 'invalid_raw_sig'
      };

      const result = service.handleWebhook(payload, 'v1=tampered_signature_hex_value');
      expect(result.success).toBeFalse();
      expect(result.statusCode).toBe(401);
      expect(result.activated).toBeFalse();
      expect(result.message).toContain('Invalid webhook signature');
      expect(service.isLectureActivatedForStudent('student_sec_01', 'lec_sec_01')).toBeFalse();
    });

    it('TC-SEC-02: should activate session when valid webhook signature is supplied', () => {
      const payload: WebhookPayload = {
        eventId: 'evt_99902',
        paymentId: 'pay_99902',
        lectureId: 'lec_sec_02',
        studentId: 'student_sec_02',
        status: 'paid',
        timestamp: Date.now(),
        signature: ''
      };
      const validSig = service.generateTestSignature(payload);

      const result = service.handleWebhook(payload, validSig);
      expect(result.success).toBeTrue();
      expect(result.statusCode).toBe(200);
      expect(result.activated).toBeTrue();
      expect(service.isLectureActivatedForStudent('student_sec_02', 'lec_sec_02')).toBeTrue();
    });

    it('TC-SEC-03: should guarantee idempotency when identical webhook event is replayed twice', () => {
      const payload: WebhookPayload = {
        eventId: 'evt_replay_001',
        paymentId: 'pay_replay_001',
        lectureId: 'lec_replay_01',
        studentId: 'student_replay_01',
        status: 'paid',
        timestamp: Date.now(),
        signature: ''
      };
      const validSig = service.generateTestSignature(payload);

      // First webhook delivery
      const res1 = service.handleWebhook(payload, validSig);
      expect(res1.success).toBeTrue();
      expect(res1.activated).toBeTrue();

      // Duplicate webhook delivery with same eventId
      const res2 = service.handleWebhook(payload, validSig);
      expect(res2.success).toBeTrue();
      expect(res2.activated).toBeFalse();
      expect(res2.message).toContain('already processed');
    });

    it('TC-SEC-04: should never expose live payment gateway secrets (sk_live) in client environment or storage', () => {
      const audit = service.performSecurityAudit();
      expect(audit.passed).toBeTrue();
      expect(audit.exposedKeys.length).toBe(0);
      expect(audit.reason).toContain('Security check passed');
    });
  });

  describe('InstaPay / Cash Receipt Fallback Checks (AG-67 & AG-68)', () => {
    it('TC-RCP-01: should accept valid InstaPay submission with Egyptian phone format and reference', (done) => {
      service.submitReceiptFallback(
        'student_rcp_1',
        'lec_rcp_1',
        'instapay',
        '01012345678',
        'TXN-987654321',
        'receipt_voucher.png'
      ).subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(res.receiptId).toBeDefined();
        const stored = service.getReceipts();
        expect(stored.length).toBe(1);
        expect(stored[0].method).toBe('instapay');
        expect(stored[0].status).toBe('pending_review');
        done();
      });
    });

    it('TC-RCP-02: should reject receipt submission with invalid non-Egyptian phone number', (done) => {
      service.submitReceiptFallback(
        'student_rcp_2',
        'lec_rcp_2',
        'cash',
        '12345678', // Invalid Egyptian phone format
        'REF-123456',
        'receipt.jpg'
      ).subscribe({
        next: () => fail('Should have failed validation'),
        error: (err) => {
          expect(err.message).toContain('Invalid Egyptian phone number format');
          done();
        }
      });
    });

    it('TC-RCP-03: should reject unaccepted receipt file extensions', (done) => {
      service.submitReceiptFallback(
        'student_rcp_3',
        'lec_rcp_3',
        'instapay',
        '01123456789',
        'REF-123456',
        'malicious_script.exe'
      ).subscribe({
        next: () => fail('Should have failed validation'),
        error: (err) => {
          expect(err.message).toContain('Invalid receipt file format');
          done();
        }
      });
    });
  });
});
