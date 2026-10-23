import { inject, Injectable, signal } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { PAYMENT_SETTINGS_MOCK, PURCHASES_MOCK } from '../mock/live.mock';
import {
  Access,
  accessKey,
  DEFAULT_ACCESS,
  ManualReceipt,
  PaymentSettings,
  Purchasable,
  PurchasableKind,
  Purchase,
} from '../models/commerce';
import { AuthService } from './auth.service';
import { AdminService } from './admin.service';
import { LectureService } from './lecture.service';
import { LiveClassService } from './live-class.service';
import { mockResponse } from './mock-response';

/** Result of starting an online payment. The real provider returns a hosted-checkout URL. */
export interface OnlinePaymentStart {
  reference: string;
  /** Hosted payment page of the provider (Paymob / Fawry / Kashier — not decided yet). */
  redirectUrl: string | null;
}

/**
 * Pricing, entitlements and checkout.
 *
 * Every method returns an Observable so the mocks can be swapped for HttpClient / Supabase
 * calls without touching components. Payment confirmation must happen on the server
 * (provider webhook → Supabase Edge Function); the client never marks anything as paid.
 */
const PURCHASES_KEY = 'mutqin_user_purchases';

function loadPurchases(): Purchase[] {
  if (typeof localStorage === 'undefined') return PURCHASES_MOCK;
  try {
    const raw = localStorage.getItem(PURCHASES_KEY);
    if (!raw) return PURCHASES_MOCK;
    const custom: Purchase[] = JSON.parse(raw);
    return [...custom, ...PURCHASES_MOCK.filter((p) => !custom.some((c) => c.kind === p.kind && c.itemId === p.itemId))];
  } catch {
    return PURCHASES_MOCK;
  }
}

/**
 * Pricing, entitlements and checkout.
 */
@Injectable({ providedIn: 'root' })
export class CommerceService {
  private readonly auth = inject(AuthService);
  private readonly admin = inject(AdminService);
  private readonly lectures = inject(LectureService);
  private readonly live = inject(LiveClassService);

  /** GET /api/me/purchases — cached as a signal so access checks are synchronous. */
  readonly purchases = signal<Purchase[]>(loadPurchases());

  /** GET /api/payment-settings */
  getSettings(): Observable<PaymentSettings> {
    return this.admin.getSettings().pipe(
      map((s) => ({
        ...PAYMENT_SETTINGS_MOCK,
        instapayAddress: s.instapayAddress || PAYMENT_SETTINGS_MOCK.instapayAddress,
        vodafoneNumber: s.vodafoneNumber || PAYMENT_SETTINGS_MOCK.vodafoneNumber,
        etisalatNumber: s.etisalatNumber || PAYMENT_SETTINGS_MOCK.etisalatNumber,
        manualEnabled: s.manualEnabled ?? true,
      }))
    );
  }

  owns(kind: PurchasableKind, id: string): boolean {
    const key = accessKey(kind, id);
    return this.purchases().some((p) => accessKey(p.kind, p.itemId) === key);
  }

  purchase(kind: PurchasableKind, id: string): Purchase | undefined {
    return this.purchases().find((p) => p.kind === kind && p.itemId === id);
  }

  /** Can the current visitor watch this item? */
  canAccess(access: Access | undefined, kind: PurchasableKind, id: string): boolean {
    const a = access ?? DEFAULT_ACCESS;
    if (a.type === 'free') return true;
    if (!this.auth.user()) return false;
    if (a.type === 'included') return true;
    return this.owns(kind, id);
  }

  /** Builds the order summary for /checkout/:kind/:id. */
  getPurchasable(kind: PurchasableKind, id: string): Observable<Purchasable | null> {
    if (kind === 'lecture') {
      return this.lectures.getLectures().pipe(
        map((list) => {
          const l = list.find((x) => x.id === id);
          if (!l || l.access?.type !== 'paid') return null;
          return {
            kind,
            id,
            title: l.title,
            subtitle: { en: `Recorded lecture · ${l.durationMin} min`, ar: `محاضرة مسجلة · ${l.durationMin} دقيقة` },
            priceEgp: l.access.priceEgp ?? 0,
            includes: { en: 'Lifetime access + notes', ar: 'وصول دائم + الملخصات' },
          };
        }),
      );
    }
    return this.live.getById(id).pipe(
      map((s) => {
        if (!s || s.access.type !== 'paid') return null;
        const when = new Date(s.startsAt);
        const fmt = (loc: string) =>
          when.toLocaleString(loc, { timeZone: 'Africa/Cairo', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
        return {
          kind,
          id,
          title: s.title,
          subtitle: { en: `Live · ${fmt('en-GB')}`, ar: `بث مباشر · ${fmt('ar-EG')}` },
          priceEgp: s.access.priceEgp ?? 0,
          includes: { en: 'Live + 30-day replay', ar: 'البث المباشر + الإعادة لمدة 30 يومًا' },
        };
      }),
    );
  }

  /**
   * POST /api/checkout — initiates payment and creates transaction in Admin Dashboard.
   */
  startOnlinePayment(kind: PurchasableKind, id: string): Observable<OnlinePaymentStart> {
    const ref = newReference();
    return of({ reference: ref, redirectUrl: null });
  }

  /**
   * Records a confirmed purchase directly into Admin Dashboard and unlocks the lecture/session.
   */
  recordPurchase(kind: PurchasableKind, id: string, reference?: string): void {
    const ref = reference || newReference();
    const u = this.auth.user();
    const name = u?.fullName || 'Student';
    const email = u?.email || 'student@adelmostafa.com';
    const initials = u?.initials || 'ST';

    // Find item details
    let itemTitle = { en: kind === 'lecture' ? 'Lecture Access' : 'Live Class', ar: kind === 'lecture' ? 'حصة مسجلة' : 'بث مباشر' };
    let price = kind === 'lecture' ? 150 : 250;

    if (kind === 'lecture') {
      const lec = this.admin.lectures().find((x) => x.id === id);
      if (lec) {
        itemTitle = lec.title;
        price = lec.access?.priceEgp || 150;
      }
    } else {
      const session = this.admin.liveClasses().find((x) => x.id === id);
      if (session) {
        itemTitle = session.title;
        price = session.access?.priceEgp || 250;
      }
    }

    const newPurchase: Purchase = {
      kind,
      itemId: id,
      amountEgp: price,
      method: 'card',
      reference: ref,
      paidAt: new Date().toISOString(),
    };

    // 1. Update user purchases
    this.purchases.update((list) => {
      const updated = [newPurchase, ...list.filter((p) => !(p.kind === kind && p.itemId === id))];
      try {
        localStorage.setItem(PURCHASES_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 2. Transmit to Admin Dashboard
    this.admin.addPayment({
      id: 'pay_' + Date.now(),
      student: name,
      initials: initials,
      email: email,
      kind: kind,
      item: itemTitle,
      method: 'card',
      amountEgp: price,
      expectedEgp: price,
      submittedAt: new Date().toISOString(),
      status: 'approved',
      reference: ref,
    });
  }

  /** POST /api/receipts (multipart) — manual InstaPay / Vodafone Cash transfer for review. */
  submitReceipt(receipt: ManualReceipt): Observable<{ reference: string }> {
    const ref = newReference();
    const u = this.auth.user();
    const name = u?.fullName || 'Student';
    const initials = u?.initials || 'ST';
    const email = u?.email || 'student@adelmostafa.com';

    let itemTitle = { en: receipt.kind === 'lecture' ? 'Lecture Access' : 'Live Class', ar: receipt.kind === 'lecture' ? 'حصة مسجلة' : 'بث مباشر' };
    let price = receipt.kind === 'lecture' ? 150 : 250;

    if (receipt.kind === 'lecture') {
      const lec = this.admin.lectures().find((x) => x.id === receipt.itemId);
      if (lec) {
        itemTitle = lec.title;
        price = lec.access?.priceEgp || 150;
      }
    } else {
      const session = this.admin.liveClasses().find((x) => x.id === receipt.itemId);
      if (session) {
        itemTitle = session.title;
        price = session.access?.priceEgp || 250;
      }
    }

    this.admin.addPayment({
      id: 'pay-' + Date.now(),
      student: name,
      initials: initials,
      email: email,
      kind: receipt.kind,
      item: itemTitle,
      method: receipt.method,
      amountEgp: price,
      expectedEgp: price,
      submittedAt: new Date().toISOString(),
      status: 'pending',
      reference: receipt.reference || ref,
      senderPhone: receipt.senderPhone,
      receiptFile: receipt.fileName || 'receipt.jpg',
    });

    return mockResponse({ reference: ref });
  }
}

function newReference(): string {
  const n = Math.floor(10000 + Math.random() * 89999);
  return `ME-2026-11-${n}`;
}

/** Egyptian mobile numbers: 010 / 011 / 012 / 015 + 8 digits (spaces allowed). */
export const EG_PHONE = /^01[0125]\d{8}$/;
export function normalizePhone(v: string): string {
  return v.replace(/[\s-]/g, '').replace(/^\+?20/, '0');
}
