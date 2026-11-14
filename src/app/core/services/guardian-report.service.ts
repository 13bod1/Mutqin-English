import { Injectable, Optional, signal } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { environment } from '../../../environments/environment';
import { GuardianContact, GuardianReport } from '../models/sprint3';

@Injectable({
  providedIn: 'root',
})
export class GuardianReportService {
  // Global admin switch to turn weekly guardian reports on or off
  readonly reportsEnabled = signal<boolean>(true);

  // Storage for student guardian contacts (can be deleted on request)
  private guardianContacts = new Map<string, GuardianContact>();

  // Storage for issued weekly guardian reports
  private issuedReports: GuardianReport[] = [];

  constructor(@Optional() private readonly supabase?: SupabaseService) {
    if (environment.production) return;
    this.loadState();
    if (this.issuedReports.length === 0) {
      this.seedSampleReports();
    }
  }

  private loadState(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const storedEnabled = localStorage.getItem('mutqin_guardian_reports_enabled');
      if (storedEnabled !== null) {
        this.reportsEnabled.set(storedEnabled === 'true');
      }
      const rawContacts = localStorage.getItem('mutqin_guardian_contacts');
      if (rawContacts) {
        const parsed = JSON.parse(rawContacts);
        Object.entries(parsed).forEach(([k, v]) => this.guardianContacts.set(k, v as GuardianContact));
      }
      const rawReports = localStorage.getItem('mutqin_guardian_reports');
      if (rawReports) {
        this.issuedReports = JSON.parse(rawReports);
      }
    } catch {}
  }

  private persistState(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem('mutqin_guardian_reports_enabled', this.reportsEnabled() ? 'true' : 'false');
      const contactsObj: Record<string, GuardianContact> = {};
      this.guardianContacts.forEach((v, k) => (contactsObj[k] = v));
      localStorage.setItem('mutqin_guardian_contacts', JSON.stringify(contactsObj));
      localStorage.setItem('mutqin_guardian_reports', JSON.stringify(this.issuedReports));
    } catch {}
  }

  /**
   * Admin master toggle for guardian reports.
   */
  setReportsEnabled(enabled: boolean): void {
    this.reportsEnabled.set(enabled);
    this.persistState();
  }

  /**
   * Seed authentic reports for students.
   */
  private seedSampleReports(): void {
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    // Active valid report for Nour Saeed
    const validReport: GuardianReport = {
      id: 'rep_u1_2026w45',
      studentId: 'u1',
      weekStart: '2026-11-09',
      tokenHash: 'tok_nour_saeed_7d_valid_hash_98a72b1',
      expiresAt: new Date(now + sevenDaysMs - 1000 * 60 * 60 * 24).toISOString(), // 6 days remaining
      data: {
        studentId: 'u1',
        studentName: 'Nour Saeed',
        stage: 'sec3',
        weekStart: '2026-11-09',
        attendanceRate: 100,
        attendedSessions: 3,
        totalSessions: 3,
        lecturesCompleted: 4,
        quizAverage: 94,
        quizzes: [
          {
            title: { en: 'Grammar: Inversion & Conditionals', ar: 'قواعد: أسلوب التقديم والتأخير والحالات الشرطية' },
            score: 19,
            maxScore: 20,
            date: '2026-11-10',
          },
          {
            title: { en: 'Vocabulary: Thanawya Unit 3 Collocations', ar: 'المفردات: متلازمات الوحدة الثالثة للثانوية العامة' },
            score: 28,
            maxScore: 30,
            date: '2026-11-12',
          },
        ],
        missedDeadlines: [],
        pointsEarned: 320,
        totalPoints: 1840,
        teacherNotes: {
          en: 'Nour showed exemplary engagement in live classes this week, actively answering grammar questions and scoring top tier on both diagnostic quizzes. Keep up the momentum!',
          ar: 'أظهرت نور التزاماً وتفاعلاً متميزاً في حصص البث المباشر لهذا الأسبوع، وأحرزت أعلى الدرجات في اختبارات التقييم الدوري للمفردات والقواعد. استمر في هذا المستوى الرائع!',
        },
      },
    };

    // Expired report sample for testing 7-day expiration enforcement
    const expiredReport: GuardianReport = {
      id: 'rep_u2_2026w44',
      studentId: 'u2',
      weekStart: '2026-10-26',
      tokenHash: 'tok_youssef_hany_expired_hash_12c44d',
      expiresAt: new Date(now - 1000 * 60 * 60 * 48).toISOString(), // Expired 2 days ago
      data: {
        studentId: 'u2',
        studentName: 'Youssef Hany',
        stage: 'sec3',
        weekStart: '2026-10-26',
        attendanceRate: 67,
        attendedSessions: 2,
        totalSessions: 3,
        lecturesCompleted: 2,
        quizAverage: 78,
        quizzes: [
          {
            title: { en: 'Reading Skills: Inference in Unseen Text', ar: 'مهارات القراءة: الاستنتاج في النصوص المتحررة' },
            score: 15,
            maxScore: 20,
            date: '2026-10-28',
          },
        ],
        missedDeadlines: ['Grammar Assignment 4'],
        pointsEarned: 180,
        totalPoints: 1210,
        teacherNotes: {
          en: 'Youssef missed one live session this week. We recommend catching up on the recorded replay and submitting the pending grammar assignment.',
          ar: 'تغيب يوسف عن حصة واحدة هذا الأسبوع. ننصح بمشاهدة التسجيل في أقرب وقت وإتمام الواجب المتأخر لتثبيت الفهم.',
        },
      },
    };

    this.issuedReports = [validReport, expiredReport];
    this.persistState();
  }

  /** Production reports are resolved by a server-side hashed, expiring capability. */
  async readReport(token: string): Promise<ReturnType<GuardianReportService['getReportByToken']>> {
    if (!environment.production) return this.getReportByToken(token);
    if (!token || !this.supabase) return { report: null, status: 'not_found' };
    try {
      const { data, error } = await this.supabase.client.rpc('read_guardian_report', { p_token: token });
      if (error || !data || !['ok', 'expired', 'disabled', 'not_found'].includes(data.status)) {
        return { report: null, status: 'not_found', errorMessage: { en: 'Unable to load this report.', ar: 'تعذر تحميل التقرير.' } };
      }
      return { status: data.status, report: data.status === 'ok' ? data.report : null };
    } catch { return { report: null, status: 'not_found' }; }
  }

  /**
   * Retrieves a guardian report by token.
   * Acceptance Criteria:
   * 1. The admin can switch the report on or off (if off, returns disabled: true).
   * 2. The link is private and expires after 7 days (if expired, returns expired: true).
   * 3. It never contains another student's data (strict token-bound lookup).
   */
  getReportByToken(tokenHash: string): {
    report: GuardianReport | null;
    status: 'ok' | 'expired' | 'disabled' | 'not_found';
    errorMessage?: { en: string; ar: string };
  } {
    if (environment.production) return { report: null, status: 'not_found' };
    if (!this.reportsEnabled()) {
      return {
        report: null,
        status: 'disabled',
        errorMessage: {
          en: 'Guardian weekly reports are currently disabled by the administration.',
          ar: 'تقارير أولياء الأمور معطلة حالياً من قِبل إدارة الأكاديمية.',
        },
      };
    }

    const report = this.issuedReports.find((r) => r.tokenHash === tokenHash);
    if (!report) {
      return {
        report: null,
        status: 'not_found',
        errorMessage: {
          en: 'Invalid report link. The requested report does not exist.',
          ar: 'رابط التقرير غير صحيح أو لم يعد متوفراً.',
        },
      };
    }

    const expiresAtMs = new Date(report.expiresAt).getTime();
    if (Date.now() > expiresAtMs) {
      return {
        report: { ...report, isExpired: true },
        status: 'expired',
        errorMessage: {
          en: 'This weekly report link has expired (links are valid for 7 days only for privacy). Please ask the student or administration for a new report link.',
          ar: 'انتهت صلاحية هذا الرابط (صلاحية الرابط 7 أيام فقط حفاظاً على خصوصية الطالب). يرجى طلب رابط تقرير محدث.',
        },
      };
    }

    return {
      report: { ...report, isExpired: false },
      status: 'ok',
    };
  }

  /**
   * Updates or saves guardian contact details in student profile.
   */
  saveGuardianContact(studentId: string, contact: GuardianContact): void {
    this.guardianContacts.set(studentId, contact);
    this.persistState();
  }

  /**
   * Deletes guardian contact field upon request (privacy compliance).
   */
  deleteGuardianContact(studentId: string): void {
    this.guardianContacts.delete(studentId);
    this.persistState();
  }

  getGuardianContact(studentId: string): GuardianContact | null {
    return this.guardianContacts.get(studentId) || null;
  }
}
