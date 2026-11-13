import { LocalizedText } from './localized';

export type LiveQuestionStatus = 'pending' | 'approved' | 'hidden' | 'answered';

export interface LiveQuestion {
  id: string;
  liveSessionId: string;
  studentId: string;
  studentName: string;
  body: string;
  status: LiveQuestionStatus;
  createdAt: string;
  answeredAt?: string;
  moderatedBy?: string;
}

export type RefundStatus = 'requested' | 'approved' | 'refunded' | 'rejected';

export interface RefundRecord {
  id: string;
  paymentId: string;
  studentName: string;
  amountEgp: number;
  paymentMethod: string;
  status: RefundStatus;
  requestedBy: string;
  approvedBy?: string;
  reason: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentReconciliationSummary {
  period: string;
  totalTransactions: number;
  totalCollectedEgp: number;
  totalRefundedEgp: number;
  netRevenueEgp: number;
  byMethod: {
    card: { count: number; totalEgp: number };
    instapay: { count: number; totalEgp: number };
    vodafone: { count: number; totalEgp: number };
    etisalat: { count: number; totalEgp: number };
  };
  mismatches: {
    paymentId: string;
    studentName: string;
    method: string;
    reportedEgp: number;
    gatewayEgp: number;
    issue: string;
  }[];
}

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: string;
}

export interface ViewingSession {
  id: string;
  userId: string;
  deviceId: string;
  startedAt: string;
  lastSeenAt: string;
  status: 'active' | 'stopped';
}

export interface SecurityFlag {
  id: string;
  userId: string;
  reason: string;
  status: 'open' | 'cleared' | 'suspended';
  createdAt: string;
  deviceId?: string;
}

export interface GuardianContact {
  name: string;
  phone: string;
  email?: string;
  relationship?: 'father' | 'mother' | 'guardian' | 'other';
}

export interface GuardianReportData {
  studentId: string;
  studentName: string;
  stage: string;
  weekStart: string;
  attendanceRate: number; // e.g. 95%
  attendedSessions: number;
  totalSessions: number;
  lecturesCompleted: number;
  quizAverage: number;
  quizzes: {
    title: LocalizedText;
    score: number;
    maxScore: number;
    date: string;
  }[];
  missedDeadlines: string[];
  pointsEarned: number;
  totalPoints: number;
  teacherNotes: LocalizedText;
}

export interface GuardianReport {
  id: string;
  studentId: string;
  weekStart: string;
  data: GuardianReportData;
  tokenHash: string;
  expiresAt: string; // 7 days from generation
  isExpired?: boolean;
}
