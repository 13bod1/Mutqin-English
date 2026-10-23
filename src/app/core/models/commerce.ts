import { LocalizedText } from './localized';

/**
 * How a lecture or live session is unlocked. The owner sets this per item:
 * - free: anyone (even guests) can watch
 * - included: every registered student can watch
 * - paid: bought individually for `priceEgp`
 */
export type AccessType = 'free' | 'included' | 'paid';

export interface Access {
  type: AccessType;
  /** Only meaningful when type === 'paid'. */
  priceEgp?: number;
}

export const DEFAULT_ACCESS: Access = { type: 'included' };

/** Things a student can buy. */
export type PurchasableKind = 'lecture' | 'live';

export interface Purchasable {
  kind: PurchasableKind;
  id: string;
  title: LocalizedText;
  /** e.g. "Live · Thu 5 Nov 2026 · 7:00 PM" */
  subtitle: LocalizedText;
  priceEgp: number;
  /** What the purchase includes, shown in the order summary. */
  includes: LocalizedText;
}

/** Statuses the payment provider redirects back with (or that our UI produces). */
export type CheckoutStatus = 'processing' | 'success' | 'failed' | 'cancelled' | 'submitted' | 'duplicate';

export type ManualMethod = 'instapay' | 'vodafone' | 'etisalat';

export interface ManualReceipt {
  kind: PurchasableKind;
  itemId: string;
  method: ManualMethod;
  senderPhone: string;
  reference: string;
  fileName: string;
}

/** Public payment settings the student site needs (GET /api/payment-settings). */
export interface PaymentSettings {
  providerConnected: boolean;
  providerName: string | null;
  manualEnabled: boolean;
  instapayAddress: string;
  vodafoneNumber: string;
  etisalatNumber: string;
  seatHoldMinutes: number;
  defaultLivePriceEgp: number;
}

/** An entitlement the signed-in student already owns (GET /api/me/purchases). */
export interface Purchase {
  kind: PurchasableKind;
  itemId: string;
  amountEgp: number;
  method: string;
  reference: string;
  paidAt: string;
}

export function accessKey(kind: PurchasableKind, id: string): string {
  return `${kind}:${id}`;
}
