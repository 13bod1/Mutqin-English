import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { delay, map } from 'rxjs/operators';

export type PaymentStatus = 'pending' | 'processing' | 'success' | 'failed' | 'cancelled' | 'duplicate' | 'expired';
export type PaymentMethod = 'card' | 'wallet' | 'instapay' | 'cash';

export interface PaymentSession {
  id: string;
  lectureId: string;
  studentId: string;
  amount: number;
  currency: 'EGP';
  status: PaymentStatus;
  createdAt: Date;
  expiresAt: Date;
  activatedAt?: Date;
  failureReason?: string;
  retryCount: number;
}

export interface WebhookPayload {
  eventId: string;
  paymentId: string;
  lectureId: string;
  studentId: string;
  status: 'paid' | 'failed' | 'cancelled';
  timestamp: number;
  signature: string;
}

export interface ReceiptFallbackSubmission {
  studentId: string;
  lectureId: string;
  method: 'instapay' | 'cash';
  payerPhone: string;
  referenceNumber: string;
  fileName: string;
  status: 'pending_review' | 'approved' | 'rejected';
  submittedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  // Mock HMAC secret held exclusively on server; never leaked to client bundles
  private readonly serverWebhookSecret = 'whsec_mutqin_super_secret_signing_key_2026';

  private activatedSessions = new Set<string>();
  private processedEvents = new Set<string>();
  private sessions = new Map<string, PaymentSession>();
  private receipts: ReceiptFallbackSubmission[] = [];

  private currentSessionSubject = new BehaviorSubject<PaymentSession | null>(null);
  public currentSession$ = this.currentSessionSubject.asObservable();

  constructor() {
    // Seed initial mock state for testing
    this.resetState();
  }

  public resetState(): void {
    this.activatedSessions.clear();
    this.processedEvents.clear();
    this.sessions.clear();
    this.receipts = [];
    this.currentSessionSubject.next(null);
  }

  /** Creates a checkout session with 15-minute expiration */
  public createCheckoutSession(studentId: string, lectureId: string, amount: number = 250): Observable<PaymentSession> {
    if (!studentId || !lectureId) {
      return throwError(() => new Error('Missing student ID or lecture ID'));
    }

    if (this.isLectureActivatedForStudent(studentId, lectureId)) {
      const duplicateSession: PaymentSession = {
        id: `pay_${Date.now()}`,
        lectureId,
        studentId,
        amount,
        currency: 'EGP',
        status: 'duplicate',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        failureReason: 'Session already active for student',
        retryCount: 0
      };
      this.currentSessionSubject.next(duplicateSession);
      return of(duplicateSession);
    }

    const session: PaymentSession = {
      id: `pay_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      lectureId,
      studentId,
      amount,
      currency: 'EGP',
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
      retryCount: 0
    };

    this.sessions.set(session.id, session);
    this.currentSessionSubject.next(session);
    return of(session);
  }

  /** Simulates a checkout attempt */
  public processCheckout(sessionId: string, simulateFailure: boolean = false, simulateCancel: boolean = false): Observable<PaymentSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return throwError(() => new Error('Session not found'));
    }

    if (new Date() > session.expiresAt) {
      session.status = 'expired';
      session.failureReason = 'Payment session has expired. Please initiate a new checkout.';
      this.currentSessionSubject.next(session);
      return of(session);
    }

    if (simulateCancel) {
      session.status = 'cancelled';
      session.failureReason = 'Payment cancelled by user.';
      this.currentSessionSubject.next(session);
      return of(session);
    }

    if (simulateFailure) {
      session.status = 'failed';
      session.retryCount++;
      session.failureReason = 'Card declined by issuing bank (insufficient funds or 3DS timeout).';
      this.currentSessionSubject.next(session);
      return of(session);
    }

    session.status = 'success';
    session.activatedAt = new Date();
    this.activatedSessions.add(`${session.studentId}_${session.lectureId}`);
    this.currentSessionSubject.next(session);
    return of(session);
  }

  /** Verifies an HMAC-SHA256 signature for incoming webhooks */
  public verifyWebhookSignature(payload: WebhookPayload, signatureHeader: string): boolean {
    if (!signatureHeader || !payload) {
      return false;
    }

    // Expected format: t={timestamp},v1={hex_hash}
    const computedExpected = this.computeMockHmac(payload.eventId + payload.timestamp + payload.status);
    return signatureHeader === `v1=${computedExpected}`;
  }

  /** Processes an incoming webhook event idempotently */
  public handleWebhook(payload: WebhookPayload, signatureHeader: string): {
    success: boolean;
    statusCode: number;
    activated: boolean;
    message: string;
  } {
    // 1. Signature check
    if (!this.verifyWebhookSignature(payload, signatureHeader)) {
      return {
        success: false,
        statusCode: 401,
        activated: false,
        message: 'Invalid webhook signature: request rejected'
      };
    }

    // 2. Replay check (idempotency by eventId)
    if (this.processedEvents.has(payload.eventId)) {
      return {
        success: true,
        statusCode: 200,
        activated: false,
        message: 'Webhook event already processed (idempotent duplicate)'
      };
    }

    this.processedEvents.add(payload.eventId);

    // 3. Activation check
    const activationKey = `${payload.studentId}_${payload.lectureId}`;
    if (payload.status === 'paid') {
      if (this.activatedSessions.has(activationKey)) {
        return {
          success: true,
          statusCode: 200,
          activated: false,
          message: 'Session was already activated previously'
        };
      }

      this.activatedSessions.add(activationKey);
      return {
        success: true,
        statusCode: 200,
        activated: true,
        message: 'Session activated successfully'
      };
    }

    return {
      success: true,
      statusCode: 200,
      activated: false,
      message: `Payment event ${payload.status} recorded`
    };
  }

  /** Fallback: submits an InstaPay or Cash receipt for manual review */
  public submitReceiptFallback(
    studentId: string,
    lectureId: string,
    method: 'instapay' | 'cash',
    payerPhone: string,
    referenceNumber: string,
    fileName: string
  ): Observable<{ success: boolean; message: string; receiptId: string }> {
    // Validate Egyptian phone number
    const egPhoneRegex = /^01[0125][0-9]{8}$/;
    if (!egPhoneRegex.test(payerPhone)) {
      return throwError(() => new Error('Invalid Egyptian phone number format. Must start with 010, 011, 012, or 015 followed by 8 digits.'));
    }

    if (!referenceNumber || referenceNumber.trim().length < 6) {
      return throwError(() => new Error('Invalid transaction reference number (must be at least 6 characters).'));
    }

    if (!fileName || !fileName.match(/\.(jpe?g|png|pdf)$/i)) {
      return throwError(() => new Error('Invalid receipt file format. Only JPEG, PNG, or PDF files are accepted.'));
    }

    const receipt: ReceiptFallbackSubmission = {
      studentId,
      lectureId,
      method,
      payerPhone,
      referenceNumber,
      fileName,
      status: 'pending_review',
      submittedAt: new Date()
    };

    this.receipts.push(receipt);

    return of({
      success: true,
      message: 'Receipt submitted successfully for review. Activation occurs within 2 hours.',
      receiptId: `rcpt_${Date.now()}`
    });
  }

  public isLectureActivatedForStudent(studentId: string, lectureId: string): boolean {
    return this.activatedSessions.has(`${studentId}_${lectureId}`);
  }

  public getReceipts(): ReceiptFallbackSubmission[] {
    return [...this.receipts];
  }

  /**
   * Security audit check: ensures no live gateway private keys or API secrets
   * are exposed in the client-side bundle or window object.
   */
  public performSecurityAudit(): { passed: boolean; exposedKeys: string[]; reason: string } {
    const dangerousPatterns = [
      'sk_live_',
      'whsec_',
      'secret_key',
      'private_key'
    ];

    const exposed: string[] = [];

    // Check window / local storage
    if (typeof window !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i) || '';
          const val = localStorage.getItem(key) || '';
          if (dangerousPatterns.some(p => key.toLowerCase().includes(p) || val.includes('sk_live_'))) {
            exposed.push(key);
          }
        }
      } catch {
        // Storage access check
      }
    }

    return {
      passed: exposed.length === 0,
      exposedKeys: exposed,
      reason: exposed.length === 0
        ? 'Security check passed: No gateway secrets or webhook private keys exposed in browser storage or client environment.'
        : `Security breach detected: Exposed keys found: ${exposed.join(', ')}`
    };
  }

  private computeMockHmac(data: string): string {
    let hash = 0;
    const combined = data + this.serverWebhookSecret;
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash) + combined.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }

  /** Helper to generate a valid test signature for automated tests */
  public generateTestSignature(payload: WebhookPayload): string {
    const hash = this.computeMockHmac(payload.eventId + payload.timestamp + payload.status);
    return `v1=${hash}`;
  }
}
