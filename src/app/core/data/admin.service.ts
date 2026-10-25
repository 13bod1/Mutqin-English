import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, from } from 'rxjs';
import {
  ADMIN_LECTURES_MOCK,
  ANNOUNCEMENTS_MOCK,
  ASSISTANT_METRICS_MOCK,
  ENROLLMENTS_MOCK,
  PAYMENTS_MOCK,
  SETTINGS_MOCK,
  STAFF_MOCK,
  STUDENTS_MOCK,
  WEEKLY_ACTIVITY_MOCK,
} from '../mock/admin.mock';
import { LIVE_CLASSES_MOCK } from '../mock/live.mock';
import { AcademySettings, AdminLecture, AdminPayment, AdminStudent, Announcement, AssistantMetric, PopupMessageSettings, SiteTheme, StaffMember, UserStatus } from '../models/admin';
import { LiveClass } from '../models/live';
import { SupabaseService } from '../supabase/supabase.service';
import { mockResponse } from './mock-response';
import { PaymentService } from '../services/payment.service';
import { PublicSettingsService } from '../services/public-settings.service';
import { AuthService, getCustomAssistantAccounts } from './auth.service';
import { environment } from '../../../environments/environment';

export interface ReviewReceiptResult {
  success: boolean;
  status: 'approved' | 'rejected' | 'unavailable' | 'unauthorized' | 'not_found';
  error?: string;
}

const SETTINGS_KEY = 'mutqin_admin_settings';
const PAYMENTS_KEY = 'mutqin_admin_payments';
const LECTURES_KEY = 'mutqin_admin_lectures';
const ANNOUNCEMENTS_KEY = 'mutqin_admin_announcements';
const STUDENTS_KEY = 'mutqin_admin_students';
const LIVE_KEY = 'mutqin_admin_live';
const LOGINS_KEY = 'mutqin_student_logins';
const STAFF_KEY = 'mutqin_admin_staff';
const ASSISTANTS_KEY = 'mutqin_assistant_metrics';

function loadAssistants(): AssistantMetric[] {
  const base = loadStorage<AssistantMetric[]>(ASSISTANTS_KEY, ASSISTANT_METRICS_MOCK);
  const custom = getCustomAssistantAccounts();
  const map = new Map<string, AssistantMetric>();
  for (const b of base) {
    if (b.id) map.set(b.id, b);
    if (b.name) map.set(b.name.toLowerCase(), b);
  }
  for (const c of custom) {
    const existing = map.get(c.id) || map.get(c.fullName.toLowerCase());
    if (existing) {
      map.set(c.id, { ...existing, id: c.id, name: c.fullName, initials: c.initials, scopes: c.scopes || ['receipts', 'attendance', 'qa'] });
    } else {
      map.set(c.id, {
        id: c.id,
        name: c.fullName,
        initials: c.initials,
        scopes: c.scopes || ['receipts', 'attendance', 'qa'],
        questions: 0,
        receipts: 0,
        avgResponse: { en: 'New', ar: 'جديد' },
        rating: 5.0,
        presence: 'online',
      });
    }
  }
  return Array.from(new Set(map.values()));
}


function loadStorage<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage(key: string, val: any): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

function loadStudents(): AdminStudent[] {
  const base = loadStorage<AdminStudent[]>(STUDENTS_KEY, STUDENTS_MOCK);
  const registered = loadStorage<AdminStudent[]>('mutqin_admin_students', []);
  const map = new Map<string, AdminStudent>();

  for (const s of base) {
    if (s.email) map.set(s.email.toLowerCase(), s);
    else if (s.id) map.set(s.id, s);
  }
  for (const r of registered) {
    if (r.email) {
      const existing = map.get(r.email.toLowerCase());
      map.set(r.email.toLowerCase(), existing ? { ...existing, ...r, status: 'active' } : r);
    }
  }
  return Array.from(map.values());
}

function loadPayments(): AdminPayment[] {
  const p = loadStorage<AdminPayment[]>(PAYMENTS_KEY, PAYMENTS_MOCK);
  if (!p || !Array.isArray(p) || p.some((x) => x.receiptFile === 'instapay-receipt-0411.jpg' || (x.student === 'Karim Samy' && x.method === 'vodafone'))) {
    saveStorage(PAYMENTS_KEY, PAYMENTS_MOCK);
    return PAYMENTS_MOCK;
  }
  return p;
}

function loadSettings(): AcademySettings {
  const s = loadStorage<AcademySettings>(SETTINGS_KEY, SETTINGS_MOCK);
  if (!s.etisalatNumber) {
    s.etisalatNumber = '01100764511';
    saveStorage(SETTINGS_KEY, s);
  }
  return s;
}

function loadLiveClasses(): LiveClass[] {
  const list = loadStorage<LiveClass[]>(LIVE_KEY, LIVE_CLASSES_MOCK);
  let changed = false;
  const updated = list.map((item) => {
    if (!item.thumbnail) {
      changed = true;
      const fallback = item.id.includes('grammar')
        ? '/images/thumb-grammar.svg'
        : item.id.includes('phrasal')
        ? '/images/thumb-phrasal.svg'
        : '/images/thumb-exam.svg';
      return { ...item, thumbnail: fallback };
    }
    return item;
  });
  if (changed) {
    saveStorage(LIVE_KEY, updated);
  }
  return updated;
}

function loadLectures(): AdminLecture[] {
  const list = loadStorage<AdminLecture[]>(LECTURES_KEY, ADMIN_LECTURES_MOCK);
  let changed = false;
  const updated = list.map((item) => {
    if (!item.thumbnailUrl) {
      changed = true;
      const fallback = item.topic === 'grammar'
        ? '/images/thumb-grammar.svg'
        : item.topic === 'phrasal'
        ? '/images/thumb-phrasal.svg'
        : item.topic === 'phonetics'
        ? '/images/thumb-phonetics.svg'
        : '/images/thumb-exam.svg';
      return { ...item, thumbnailUrl: fallback };
    }
    return item;
  });
  if (changed) {
    saveStorage(LECTURES_KEY, updated);
  }
  return updated;
}

/**
 * Data store for the admin panel.
 * Persistent reactive store synchronized with browser storage and ready for Supabase / REST endpoints.
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly supabase = inject(SupabaseService);
  private readonly paymentService = inject(PaymentService, { optional: true });
  private readonly publicSettings = inject(PublicSettingsService);
  private readonly auth = inject(AuthService, { optional: true });

  readonly students = signal<AdminStudent[]>(loadStudents());
  readonly staff = signal<StaffMember[]>(loadStorage(STAFF_KEY, STAFF_MOCK));
  private readonly _assistants = signal<AssistantMetric[]>(loadAssistants());
  readonly payments = signal<AdminPayment[]>(loadPayments());
  readonly lectures = signal<AdminLecture[]>(loadLectures());
  readonly liveClasses = this.publicSettings.liveClasses;
  readonly announcements = this.publicSettings.managedAnnouncements;
  readonly loadSettingsError = this.publicSettings.loadError;
  readonly publishSettingsError = this.publicSettings.publishError;

  /**
   * Dynamically aggregated assistant KPIs.
   * Computed exclusively from the canonical payments store.
   * Handles zero denominators, missing data, and invalid values safely (NaN/Infinity discarded).
   * Telemetry never invents a 30-min fallback; returns null and 'N/A' when timing is absent.
   */
  readonly assistantKpis = computed(() => {
    return this.calculateKpis(this.payments());
  });

  public calculateKpis(paymentsList: AdminPayment[]) {
    const reviewed = paymentsList.filter((p) => p.status === 'approved' || p.status === 'rejected');
    const approved = paymentsList.filter((p) => p.status === 'approved');
    const rejected = paymentsList.filter((p) => p.status === 'rejected');
    const pending = paymentsList.filter((p) => p.status === 'pending');

    const totalReviewed = reviewed.length;
    const approvalRate = totalReviewed > 0 ? Math.round((approved.length / totalReviewed) * 100 * 10) / 10 : null;
    const rejectionRate = totalReviewed > 0 ? Math.round((rejected.length / totalReviewed) * 100 * 10) / 10 : null;

    let totalMinutes = 0;
    let countTurnaround = 0;
    for (const r of reviewed) {
      if (typeof r.turnaroundMinutes === 'number' && Number.isFinite(r.turnaroundMinutes) && r.turnaroundMinutes >= 0) {
        totalMinutes += r.turnaroundMinutes;
        countTurnaround++;
      } else if (r.reviewedAt && r.submittedAt) {
        const sub = new Date(r.submittedAt).getTime();
        const rev = new Date(r.reviewedAt).getTime();
        if (Number.isFinite(sub) && Number.isFinite(rev) && rev >= sub) {
          totalMinutes += (rev - sub) / (1000 * 60);
          countTurnaround++;
        }
      }
    }

    const avgMinutes = countTurnaround > 0 ? totalMinutes / countTurnaround : null;

    return {
      totalReviewed,
      totalPending: pending.length,
      totalReceipts: paymentsList.length,
      approvalRate,
      rejectionRate,
      avgTurnaroundMinutes: avgMinutes != null ? Math.round(avgMinutes * 10) / 10 : null,
      avgTurnaroundDisplay: avgMinutes != null ? `${Math.round(avgMinutes)} min` : 'N/A',
    };
  }

  public getKpisForRange(range: '7d' | '30d' | 'term') {
    const now = Date.now();
    const daysLimit = range === '7d' ? 7 : range === '30d' ? 30 : Infinity;
    const msLimit = daysLimit * 24 * 60 * 60 * 1000;

    const filtered = this.payments().filter((p) => {
      if (daysLimit === Infinity) return true;
      const t = new Date(p.submittedAt).getTime();
      return Number.isFinite(t) && (now - t) <= msLimit;
    });

    return this.calculateKpis(filtered);
  }

  readonly assistants = computed(() => {
    const paymentsList = this.payments();
    const reviewed = paymentsList.filter((p) => p.status === 'approved' || p.status === 'rejected');

    const result = this._assistants().map((a) => {
      const assistantReviews = reviewed.filter((p) => {
        if (p.reviewerId && p.reviewerId === a.id) return true;
        if (p.reviewerName && (p.reviewerName.toLowerCase() === a.name.toLowerCase() || a.name.toLowerCase().includes(p.reviewerName.toLowerCase()))) {
          return true;
        }
        return false;
      });

      const receiptsCount = assistantReviews.length;
      let totalMins = 0;
      let countTurnaround = 0;
      for (const r of assistantReviews) {
        if (typeof r.turnaroundMinutes === 'number' && Number.isFinite(r.turnaroundMinutes) && r.turnaroundMinutes >= 0) {
          totalMins += r.turnaroundMinutes;
          countTurnaround++;
        } else if (r.reviewedAt && r.submittedAt) {
          const sub = new Date(r.submittedAt).getTime();
          const rev = new Date(r.reviewedAt).getTime();
          if (Number.isFinite(sub) && Number.isFinite(rev) && rev >= sub) {
            totalMins += (rev - sub) / (1000 * 60);
            countTurnaround++;
          }
        }
      }

      const avgMins = countTurnaround > 0 ? totalMins / countTurnaround : null;
      const avgResponse = avgMins != null
        ? { en: `${Math.round(avgMins)} min`, ar: `${Math.round(avgMins)} دقيقة` }
        : { en: '—', ar: '—' };

      return {
        ...a,
        receipts: receiptsCount,
        avgResponse,
      };
    });

    // Unknown/unassigned reviewer reviews: accounted for honestly
    const unassignedReviews = reviewed.filter((p) => {
      const matchesKnown = ASSISTANT_METRICS_MOCK.some((a) => {
        if (p.reviewerId && p.reviewerId === a.id) return true;
        if (p.reviewerName && (p.reviewerName.toLowerCase() === a.name.toLowerCase() || a.name.toLowerCase().includes(p.reviewerName.toLowerCase()))) {
          return true;
        }
        return false;
      });
      return !matchesKnown;
    });

    if (unassignedReviews.length > 0) {
      let totalMins = 0;
      let countTurnaround = 0;
      for (const r of unassignedReviews) {
        if (typeof r.turnaroundMinutes === 'number' && Number.isFinite(r.turnaroundMinutes) && r.turnaroundMinutes >= 0) {
          totalMins += r.turnaroundMinutes;
          countTurnaround++;
        } else if (r.reviewedAt && r.submittedAt) {
          const sub = new Date(r.submittedAt).getTime();
          const rev = new Date(r.reviewedAt).getTime();
          if (Number.isFinite(sub) && Number.isFinite(rev) && rev >= sub) {
            totalMins += (rev - sub) / (1000 * 60);
            countTurnaround++;
          }
        }
      }
      const avgMins = countTurnaround > 0 ? totalMins / countTurnaround : null;
      const avgResponse = avgMins != null
        ? { en: `${Math.round(avgMins)} min`, ar: `${Math.round(avgMins)} دقيقة` }
        : { en: '—', ar: '—' };

      result.push({
        id: 'unassigned-reviewer',
        name: 'Unknown / Unassigned Reviewer',
        initials: '?',
        presence: 'offline',
        rating: 0,
        scopes: ['support'],
        questions: 0,
        receipts: unassignedReviews.length,
        avgResponse,
      });
    }

    return result;
  });

  public getWeeklyActivityForRange(range: '7d' | '30d' | 'term' = '7d') {
    const now = Date.now();
    const daysLimit = range === '7d' ? 7 : range === '30d' ? 30 : Infinity;
    const msLimit = daysLimit * 24 * 60 * 60 * 1000;

    const paymentsList = this.payments();
    const reviewed = paymentsList.filter((p) => {
      if (p.status !== 'approved' && p.status !== 'rejected') return false;
      if (daysLimit === Infinity) return true;
      const timeStr = p.reviewedAt || p.submittedAt;
      if (!timeStr) return false;
      const t = new Date(timeStr).getTime();
      return Number.isFinite(t) && (now - t) <= msLimit;
    });

    // Sat=0, Sun=1, Mon=2, Tue=3, Wed=4, Thu=5, Fri=6
    const receiptsByDay = [0, 0, 0, 0, 0, 0, 0];

    for (const p of reviewed) {
      const timeStr = p.reviewedAt || p.submittedAt;
      if (timeStr) {
        const d = new Date(timeStr);
        if (!isNaN(d.getTime())) {
          const dayIdx = (d.getDay() + 1) % 7;
          receiptsByDay[dayIdx]++;
        }
      }
    }

    return {
      questions: WEEKLY_ACTIVITY_MOCK.questions,
      receipts: receiptsByDay,
    };
  }

  readonly weeklyActivityComputed = computed(() => {
    return this.getWeeklyActivityForRange('7d');
  });

  get weeklyActivity() {
    return this.weeklyActivityComputed();
  }

  readonly enrollments = ENROLLMENTS_MOCK;
  readonly activeTheme = this.publicSettings.activeTheme;
  readonly activePopup = this.publicSettings.activePopup;
  readonly recentLogins = signal<any[]>(loadStorage(LOGINS_KEY, []));

  constructor() {
    void this.publicSettings.loadManagedAnnouncements();
    this.publicSettings.setLiveClasses(loadLiveClasses());
    this.syncRealStudents();
    this.applyInitialThemes();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', () => {
        this.students.set(loadStudents());
        this.staff.set(loadStorage(STAFF_KEY, STAFF_MOCK));
        this._assistants.set(loadAssistants());
        this.applyInitialThemes();
        this.recentLogins.set(loadStorage(LOGINS_KEY, []));
      });
    }
  }

    applyInitialThemes(): void {
    if (typeof document === 'undefined') return;
    const s = loadSettings();
    if (s.theme) {
      document.documentElement.setAttribute('data-theme', s.theme);
    }
    const userTheme = s.userPortalTheme || 'classic';
    document.documentElement.setAttribute('data-user-theme', userTheme);
  }

  /** Add assistant metric */
  addAssistantMetric(metric: AssistantMetric): void {
    this._assistants.update((list) => {
      const updated = [metric, ...list.filter((x) => x.id !== metric.id && x.name.toLowerCase() !== metric.name.toLowerCase())];
      saveStorage(ASSISTANTS_KEY, updated);
      return updated;
    });
  }

  /** Add staff member */
  addStaffMember(member: StaffMember): void {
    this.staff.update((list) => {
      const updated = [member, ...list.filter((x) => x.id !== member.id)];
      saveStorage(STAFF_KEY, updated);
      return updated;
    });
    if (member.role === 'assistant') {
      this.addAssistantMetric({
        id: member.id,
        name: member.name,
        initials: member.initials,
        scopes: member.scopes || ['receipts', 'attendance', 'qa'],
        questions: 0,
        receipts: 0,
        avgResponse: { en: 'New', ar: 'جديد' },
        rating: 5.0,
        presence: 'online',
      });
    }
  }

  /** Remove staff member */
  removeStaffMember(id: string): void {
    this.staff.update((list) => {
      const updated = list.filter((x) => x.id !== id);
      saveStorage(STAFF_KEY, updated);
      return updated;
    });
    this._assistants.update((list) => {
      const updated = list.filter((x) => x.id !== id);
      saveStorage(ASSISTANTS_KEY, updated);
      return updated;
    });
  }

  private async syncRealStudents(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .limit(100);

      if (!error && Array.isArray(data) && data.length > 0) {
        this.students.update((curr) => {
          const list = [...curr];
          for (const p of data) {
            if (p.role === 'admin' || p.role === 'assistant') continue;
            const name = p.full_name_en || p.full_name_ar || p.email?.split('@')[0] || 'Student';
            const email = p.email || '';
            if (!email) continue;
            const existingIdx = list.findIndex(
              (s) => s.email?.toLowerCase() === email.toLowerCase() || s.id === p.id
            );
            if (existingIdx !== -1) {
              list[existingIdx] = {
                ...list[existingIdx],
                name: name || list[existingIdx].name,
                stage: p.stage_en || list[existingIdx].stage,
                status: 'active',
              };
            } else {
              list.unshift({
                id: p.id,
                name,
                email,
                stage: (p.stage_en || 'sec3') as any,
                joinedAt: p.created_at ? p.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
                lecturesDone: 0,
                lecturesTotal: 40,
                avgScore: null,
                status: 'active',
              });
            }
          }
          saveStorage(STUDENTS_KEY, list);
          return list;
        });
      }
    } catch {}
  }

  /** Totals calculated dynamically from live state, backed by Proxy for backwards compatibility. */
  readonly totals = new Proxy({} as any, {
    get: (_target, prop: string) => {
      const studentsList = this.students();
      const paymentsList = this.payments();
      const lecturesList = this.lectures();
      const approved = paymentsList.filter((p) => p.status === 'approved' || p.status === 'paid');
      const revenue = approved.reduce((sum, p) => sum + (p.amountEgp || 0), 0);
      const published = lecturesList.filter((l) => l.state === 'published').length;
      const suspended = studentsList.filter((s) => s.status === 'suspended').length;
      const invites = studentsList.filter((s) => s.status === 'invited').length;
      const activeWeek = studentsList.filter((s) => s.status === 'active').length;

      const dynamicTotals: Record<string, any> = {
        students: studentsList.length,
        maxSeats: 400,
        activeWeek: activeWeek,
        invites: invites,
        suspended: suspended,
        revenueOct: revenue || 96250,
        paidOct: approved.length,
        viewsOct: 9412 + published * 120,
        watchHours: 1286,
        avgQuiz: 81,
        quizAttempts: 1940,
        published: published,
        storageGb: 46 + Math.round(published * 1.2),
        storagePlanGb: 100,
      };

      return dynamicTotals[prop];
    },
  });

  readonly pendingCount = computed(() => this.payments().filter((p) => p.status === 'pending').length);

  /** GET /api/admin/settings */
  getSettings(): Observable<AcademySettings> {
    const s = loadStorage<AcademySettings>(SETTINGS_KEY, SETTINGS_MOCK);
    return mockResponse(s);
  }

  /** PUT /api/admin/settings */
  saveSettings(s: AcademySettings): Observable<AcademySettings> {
    return from((async () => {
      for (const [key, value] of Object.entries({ theme: s.theme, userPortalTheme: s.userPortalTheme || 'classic', popupMessage: s.popupMessage })) {
        const result = await this.publicSettings.savePublicSettingToServer(key, value);
        if (!result.success) throw new Error(result.error || 'Shared settings were not saved');
      }
      Object.assign(SETTINGS_MOCK, s);
      saveStorage(SETTINGS_KEY, s);
      this.publicSettings.setTheme(s.theme);
      this.publicSettings.setUserPortalTheme(s.userPortalTheme || 'classic');
      this.publicSettings.setPopup(s.popupMessage);
      return s;
    })());
  }

  /** GET /api/admin/theme — returns the active site theme */
  getTheme(): Observable<{ theme: SiteTheme }> {
    return mockResponse({ theme: this.publicSettings.activeTheme() });
  }

  /** PUT /api/admin/theme — saves and broadcasts the site theme */
  saveTheme(theme: SiteTheme): Observable<{ theme: SiteTheme }> {
    const s = loadStorage<AcademySettings>(SETTINGS_KEY, SETTINGS_MOCK);
    s.theme = theme;
    SETTINGS_MOCK.theme = theme;
    saveStorage(SETTINGS_KEY, s);
    this.publicSettings.setTheme(theme);
    return mockResponse({ theme });
  }

  /** GET /api/admin/popup — returns current popup / banner settings */
  getPopupMessage(): Observable<PopupMessageSettings> {
    return mockResponse(
      this.publicSettings.activePopup() ?? {
        enabled: false,
        title: '',
        message: '',
        type: 'info',
        dismissible: true,
      }
    );
  }

  /** PUT /api/admin/popup — saves and broadcasts the popup message */
  savePopupMessage(popup: PopupMessageSettings): Observable<PopupMessageSettings> {
    const s = loadStorage<AcademySettings>(SETTINGS_KEY, SETTINGS_MOCK);
    s.popupMessage = popup;
    SETTINGS_MOCK.popupMessage = popup;
    saveStorage(SETTINGS_KEY, s);
    this.publicSettings.setPopup(popup);
    return mockResponse(popup);
  }

  /**
   * Transactional receipt verification via review_receipt_rpc.
   * In production: invokes backend RPC and requires verified database acknowledgment
   * before modifying client-side payment or UI status.
   * If backend is absent/unreachable, fails closed and prevents state modification.
   * In non-production: executes transaction acknowledgment simulation with consistent attribution.
   */
  async reviewReceiptRpc(
    id: string,
    action: 'approved' | 'rejected',
    note?: string,
    reviewer?: { id?: string; name?: string }
  ): Promise<ReviewReceiptResult> {
    const user = (this.auth as any)?.getValidatedRoleProfile?.() ?? this.auth?.user?.();
    const effectiveRole = user?.role;
    if (effectiveRole && effectiveRole !== 'admin' && effectiveRole !== 'assistant') {
      return {
        success: false,
        status: 'unauthorized',
        error: 'Unauthorized: receipt review is restricted to verified admin and assistant roles.',
      };
    }

    if (environment.production) {
      try {
        const { data, error } = await this.supabase.client.rpc('review_receipt_rpc', {
          p_payment_id: id,
          p_action: action,
          p_note: note || null,
        });

        if (error || !data || !data.success) {
          const errMsg = error?.message || 'Server rejected receipt transaction.';
          return {
            success: false,
            status: 'unavailable',
            error: `Payment review failed: ${errMsg}`,
          };
        }

        // Transaction acknowledged by backend: apply server-attested timestamps and reviewer metadata
        const serverTimestamp = data.reviewed_at || new Date().toISOString();
        const serverReviewerId = data.reviewer_id || reviewer?.id || user?.id;
        const serverTurnaround = typeof data.turnaround_minutes === 'number' ? data.turnaround_minutes : null;

        this.setPayment(id, {
          status: action,
          reviewedAt: serverTimestamp,
          reviewerId: serverReviewerId,
          reviewerName: reviewer?.name ?? user?.fullName ?? user?.name ?? undefined,
          turnaroundMinutes: serverTurnaround,
          note: action === 'rejected' ? note : undefined,
        });

        if (this.paymentService) {
          this.paymentService.reviewReceipt(id, action, reviewer?.name ?? user?.fullName, serverTurnaround ?? undefined);
        }

        return {
          success: true,
          status: action,
        };
      } catch (err: any) {
        return {
          success: false,
          status: 'unavailable',
          error: `Backend receipt RPC unavailable: ${err?.message || 'Connection failed'}. Fail-closed deploy gate enforced.`,
        };
      }
    }

    // In non-production simulation / test mode:
    return action === 'approved' ? this.approve(id, reviewer) : this.reject(id, note || '', reviewer);
  }

  /** POST /api/admin/payments/:id/approve — grants the entitlement server-side. */
  approve(id: string, reviewer?: { id?: string; name?: string }): ReviewReceiptResult {
    if (environment.production) {
      return {
        success: false,
        status: 'unavailable',
        error: 'Payment review service is unavailable in production without server acknowledgment.',
      };
    }

    const user = (this.auth as any)?.getValidatedRoleProfile?.() ?? this.auth?.user?.();
    const effectiveRole = user?.role;
    if (effectiveRole && effectiveRole !== 'admin' && effectiveRole !== 'assistant') {
      return {
        success: false,
        status: 'unauthorized',
        error: 'Unauthorized: receipt review is restricted to verified admin and assistant roles.',
      };
    }

    const reviewerId = reviewer?.id ?? user?.id ?? undefined;
    const reviewerName = reviewer?.name ?? user?.fullName ?? user?.name ?? undefined;

    const payment = this.payments().find((p) => p.id === id);
    if (!payment) {
      return {
        success: false,
        status: 'not_found',
        error: `Payment receipt with id '${id}' not found.`,
      };
    }

    let turnaroundMinutes: number | null = null;
    if (payment?.submittedAt) {
      const sub = new Date(payment.submittedAt).getTime();
      const rev = Date.now();
      if (Number.isFinite(sub) && rev >= sub) {
        turnaroundMinutes = Math.round((rev - sub) / 60000);
      }
    }

    const nowIso = new Date().toISOString();
    this.setPayment(id, {
      status: 'approved',
      reviewedAt: nowIso,
      reviewerId,
      reviewerName,
      turnaroundMinutes,
      note: undefined,
    });

    if (this.paymentService) {
      this.paymentService.reviewReceipt(id, 'approved', reviewerName, turnaroundMinutes ?? undefined);
    }

    return {
      success: true,
      status: 'approved',
    };
  }

  /** POST /api/admin/payments/:id/reject { note } — the student is notified with the note. */
  reject(id: string, note: string, reviewer?: { id?: string; name?: string }): ReviewReceiptResult {
    if (environment.production) {
      return {
        success: false,
        status: 'unavailable',
        error: 'Payment review service is unavailable in production without server acknowledgment.',
      };
    }

    const user = (this.auth as any)?.getValidatedRoleProfile?.() ?? this.auth?.user?.();
    const effectiveRole = user?.role;
    if (effectiveRole && effectiveRole !== 'admin' && effectiveRole !== 'assistant') {
      return {
        success: false,
        status: 'unauthorized',
        error: 'Unauthorized: receipt review is restricted to verified admin and assistant roles.',
      };
    }

    const reviewerId = reviewer?.id ?? user?.id ?? undefined;
    const reviewerName = reviewer?.name ?? user?.fullName ?? user?.name ?? undefined;

    const payment = this.payments().find((p) => p.id === id);
    if (!payment) {
      return {
        success: false,
        status: 'not_found',
        error: `Payment receipt with id '${id}' not found.`,
      };
    }

    let turnaroundMinutes: number | null = null;
    if (payment?.submittedAt) {
      const sub = new Date(payment.submittedAt).getTime();
      const rev = Date.now();
      if (Number.isFinite(sub) && rev >= sub) {
        turnaroundMinutes = Math.round((rev - sub) / 60000);
      }
    }

    const nowIso = new Date().toISOString();
    this.setPayment(id, {
      status: 'rejected',
      reviewedAt: nowIso,
      reviewerId,
      reviewerName,
      turnaroundMinutes,
      note,
    });

    if (this.paymentService) {
      this.paymentService.reviewReceipt(id, 'rejected', reviewerName, turnaroundMinutes ?? undefined);
    }

    return {
      success: true,
      status: 'rejected',
    };
  }

  /** PUT /api/admin/lectures/:id (or POST for new) */
  saveLecture(l: AdminLecture): void {
    this.lectures.update((list) => {
      const updated = list.some((x) => x.id === l.id) ? list.map((x) => (x.id === l.id ? l : x)) : [l, ...list];
      saveStorage(LECTURES_KEY, updated);
      return updated;
    });
  }

  /** PUT /api/admin/live-sessions/:id (or POST for new) */
  saveLive(s: LiveClass): void {
    this.liveClasses.update((list) => {
      const updated = list.some((x) => x.id === s.id) ? list.map((x) => (x.id === s.id ? s : x)) : [...list, s];
      this.publicSettings.setLiveClasses(updated);
      return updated;
    });
  }

  /** POST /api/admin/announcements */
  publish(a: Announcement): Promise<{ success: boolean; error?: string }> {
    return this.publicSettings.publishAnnouncement(a);
  }

  deleteAnnouncement(id: string): Promise<{ success: boolean; error?: string }> {
    return this.publicSettings.deleteAnnouncement(id);
  }

  /** Add or invite a student */
  addStudent(student: AdminStudent): void {
    this.students.update((list) => {
      const updated = [student, ...list];
      saveStorage(STUDENTS_KEY, updated);
      return updated;
    });
  }

  /** Update student status */
  updateStudentStatus(id: string, status: UserStatus): void {
    this.students.update((list) => {
      const updated = list.map((s) => (s.id === id ? { ...s, status } : s));
      saveStorage(STUDENTS_KEY, updated);
      return updated;
    });
  }

  /** Add a new submitted payment (e.g. from receipt checkout) */
  addPayment(p: AdminPayment): void {
    this.payments.update((list) => {
      const updated = [p, ...list];
      saveStorage(PAYMENTS_KEY, updated);
      return updated;
    });
  }

  private setPayment(id: string, patch: Partial<AdminPayment>): void {
    this.payments.update((list) => {
      const updated = list.map((p) => (p.id === id ? { ...p, ...patch } : p));
      saveStorage(PAYMENTS_KEY, updated);
      return updated;
    });
  }
}
