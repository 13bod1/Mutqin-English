import { Access, ManualMethod, PurchasableKind } from './commerce';
import { AcademicStage } from './lecture';
import { LocalizedText } from './localized';

export type UserStatus = 'active' | 'invited' | 'suspended';
export type StaffRole = 'owner' | 'assistant';

export interface AdminStudent {
  id: string;
  name: string;
  email: string;
  stage: AcademicStage;
  joinedAt: string;
  lecturesDone: number;
  lecturesTotal: number;
  avgScore: number | null;
  status: UserStatus;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: StaffRole;
  /** e.g. ['payments', 'qa', 'chat'] */
  scopes: string[];
}

export type PaymentRowStatus = 'pending' | 'approved' | 'rejected' | 'paid' | 'failed' | 'refunded';
export type PaymentMethodLabel = 'card' | ManualMethod;

export interface AdminPayment {
  id: string;
  student: string;
  initials: string;
  email: string;
  kind: PurchasableKind;
  item: LocalizedText;
  method: PaymentMethodLabel;
  methodDetail?: string;
  amountEgp: number;
  expectedEgp: number;
  submittedAt: string;
  status: PaymentRowStatus;
  reference: string;
  senderPhone?: string;
  receiptFile?: string;
  receiptFiles?: string[];
  duplicateOf?: string;
  note?: string;
  reviewedAt?: string | null;
  reviewerId?: string | null;
  reviewerName?: string | null;
  turnaroundMinutes?: number | null;
}

export type LectureState = 'published' | 'draft' | 'processing' | 'scheduled';

export interface AdminLecture {
  id: string;
  title: LocalizedText;
  topic: string;
  stage: AcademicStage;
  durationMin: number | null;
  views: number | null;
  state: LectureState;
  access: Access;
  uploadPercent?: number;
  publishAt?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
}

export type AnnouncementState = 'scheduled' | 'sent' | 'draft';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: string;
  channels: ('inApp' | 'email')[];
  state: AnnouncementState;
  pinned?: boolean;
  at: string;
  seen?: number;
  reach?: number;
  icon: string;
}

export interface AssistantMetric {
  id: string;
  name: string;
  initials: string;
  scopes: string[];
  questions: number;
  receipts: number | null;
  avgResponse: LocalizedText;
  rating: number;
  presence: 'online' | 'away' | 'offline';
}

export type SiteTheme = 'light' | 'dark' | 'system';
export type UserPortalTheme = 'classic' | 'navy' | 'emerald' | 'purple' | 'gold';

export interface PopupMessageSettings {
  enabled: boolean;
  title: string;
  message: string;
  type: 'info' | 'announcement' | 'warning' | 'success';
  dismissible: boolean;
  linkText?: string;
  linkUrl?: string;
}

export interface AcademySettings {
  name: string;
  whatsapp: string;
  supportEmail: string;
  supportHours: string;
  defaultLivePriceEgp: number;
  defaultLectureAccess: Access['type'];
  defaultLecturePriceEgp: number;
  seatHoldMinutes: number;
  providerConnected: boolean;
  manualEnabled: boolean;
  instapayAddress: string;
  vodafoneNumber: string;
  etisalatNumber: string;
  flagDuplicates: boolean;
  muxConnected: boolean;
  maxViewers: number;
  joinOpensMin: number;
  recordReplays: boolean;
  slowMode: boolean;
  defaultLang: 'en' | 'ar';
  showLangSwitch: boolean;
  theme: SiteTheme;
  userPortalTheme?: UserPortalTheme;
  popupMessage: PopupMessageSettings;
  liveStreamUrl?: string;
}
