import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
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
import { getCustomAssistantAccounts } from './auth.service';
import { mockResponse } from './mock-response';

const SETTINGS_KEY = 'mutqin_admin_settings';
const PAYMENTS_KEY = 'mutqin_admin_payments';
const LECTURES_KEY = 'mutqin_admin_lectures';
const ANNOUNCEMENTS_KEY = 'mutqin_admin_announcements';
const STUDENTS_KEY = 'mutqin_admin_students';
const LIVE_KEY = 'mutqin_admin_live';
const LOGINS_KEY = 'mutqin_student_logins';
const STAFF_KEY = 'mutqin_admin_staff';
const ASSISTANTS_KEY = 'mutqin_assistant_metrics';

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
  const registeredAccounts = loadStorage<any[]>('mutqin_student_accounts', []);
  const registeredLegacy = loadStorage<AdminStudent[]>('mutqin_admin_students', []);
  const map = new Map<string, AdminStudent>();

  // 1. Base / mock students
  for (const s of STUDENTS_MOCK) {
    if (s.email) map.set(s.email.toLowerCase(), s);
    else if (s.id) map.set(s.id, s);
  }
  for (const b of base) {
    if (b.email) map.set(b.email.toLowerCase(), b);
    else if (b.id) map.set(b.id, b);
  }
  for (const r of registeredLegacy) {
    if (r.email) {
      const existing = map.get(r.email.toLowerCase());
      map.set(r.email.toLowerCase(), existing ? { ...existing, ...r, status: 'active' } : r);
    }
  }

  // 2. Put newly registered student accounts at the top!
  for (const acc of registeredAccounts) {
    if (acc.email) {
      const studentObj: AdminStudent = {
        id: acc.id,
        name: acc.fullName || acc.name || acc.email.split('@')[0],
        email: acc.email,
        stage: acc.stage || 'sec3',
        joinedAt: acc.createdAt ? acc.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
        lecturesDone: 0,
        lecturesTotal: 40,
        avgScore: null,
        status: 'active',
      };
      map.set(acc.email.toLowerCase(), studentObj);
    }
  }

  const all = Array.from(map.values());
  // Sort newly registered students first
  all.sort((a, b) => (b.joinedAt || '').localeCompare(a.joinedAt || ''));
  return all;
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
  let changed = false;
  if (!s.etisalatNumber) {
    s.etisalatNumber = '01100764511';
    changed = true;
  }
  if (s.popupMessage && (s.popupMessage.linkText === 'Explore sessions' || s.popupMessage.linkText?.toLowerCase().includes('explore session'))) {
    s.popupMessage.linkText = '';
    s.popupMessage.linkUrl = '';
    changed = true;
  }
  if (changed) {
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

/**
 * Data store for the admin panel.
 * Persistent reactive store synchronized with browser storage and ready for Supabase / REST endpoints.
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly supabase = inject(SupabaseService);

  readonly students = signal<AdminStudent[]>(loadStudents());
  readonly staff = signal<StaffMember[]>(loadStorage(STAFF_KEY, STAFF_MOCK));
  readonly payments = signal<AdminPayment[]>(loadPayments());
  readonly lectures = signal<AdminLecture[]>(loadLectures());
  readonly liveClasses = signal<LiveClass[]>(loadLiveClasses());
  readonly announcements = signal<Announcement[]>(loadStorage(ANNOUNCEMENTS_KEY, ANNOUNCEMENTS_MOCK));
  readonly assistants = signal<AssistantMetric[]>(loadAssistants());
  readonly weeklyActivity = WEEKLY_ACTIVITY_MOCK;
  readonly enrollments = ENROLLMENTS_MOCK;
  readonly activeTheme = signal<SiteTheme>(loadSettings().theme ?? 'light');
  readonly activePopup = signal<PopupMessageSettings | null>(loadSettings().popupMessage ?? null);
  readonly recentLogins = signal<any[]>(loadStorage(LOGINS_KEY, []));

  constructor() {
    this.syncRealStudents();
    this.applyInitialThemes();
    if (typeof window !== 'undefined') {
      const refreshAll = () => {
        this.students.set(loadStudents());
        this.recentLogins.set(loadStorage(LOGINS_KEY, []));
        this.staff.set(loadStorage(STAFF_KEY, STAFF_MOCK));
        this.payments.set(loadPayments());
        this.announcements.set(loadStorage(ANNOUNCEMENTS_KEY, ANNOUNCEMENTS_MOCK));
        this.liveClasses.set(loadStorage(LIVE_KEY, LIVE_CLASSES_MOCK));
        this.lectures.set(loadStorage(LECTURES_KEY, ADMIN_LECTURES_MOCK));
        this.assistants.set(loadAssistants());
        this.applyInitialThemes();
      };

      window.addEventListener('storage', refreshAll);
      window.addEventListener('mutqin_students_updated', () => this.students.set(loadStudents()));
      window.addEventListener('mutqin_lectures_updated', () => this.lectures.set(loadStorage(LECTURES_KEY, ADMIN_LECTURES_MOCK)));
      window.addEventListener('mutqin_announcements_updated', () => this.announcements.set(loadStorage(ANNOUNCEMENTS_KEY, ANNOUNCEMENTS_MOCK)));
      window.addEventListener('mutqin_theme_updated', () => this.applyInitialThemes());
    }
  }

  applyInitialThemes(): void {
    if (typeof document === 'undefined') return;
    const s = loadSettings();
    if (s.theme) {
      document.documentElement.setAttribute('data-theme', s.theme);
      this.activeTheme.set(s.theme);
    }
    const userTheme = s.userPortalTheme || 'classic';
    document.documentElement.setAttribute('data-user-theme', userTheme);
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
    Object.assign(SETTINGS_MOCK, s);
    saveStorage(SETTINGS_KEY, s);
    if (s.theme) {
      this.activeTheme.set(s.theme);
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', s.theme);
      }
    }
    if (s.userPortalTheme) {
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-user-theme', s.userPortalTheme);
      }
    }
    if (s.popupMessage !== undefined) {
      this.activePopup.set(s.popupMessage);
    }
    window.dispatchEvent(new Event('storage'));
    return mockResponse(s);
  }

  /** GET /api/admin/theme — returns the active site theme */
  getTheme(): Observable<{ theme: SiteTheme }> {
    const s = loadStorage<AcademySettings>(SETTINGS_KEY, SETTINGS_MOCK);
    return mockResponse({ theme: s.theme ?? 'light' });
  }

  /** PUT /api/admin/theme — saves and broadcasts the site theme */
  saveTheme(theme: SiteTheme): Observable<{ theme: SiteTheme }> {
    const s = loadStorage<AcademySettings>(SETTINGS_KEY, SETTINGS_MOCK);
    s.theme = theme;
    SETTINGS_MOCK.theme = theme;
    saveStorage(SETTINGS_KEY, s);
    this.activeTheme.set(theme);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    return mockResponse({ theme });
  }

  /** GET /api/admin/popup — returns current popup / banner settings */
  getPopupMessage(): Observable<PopupMessageSettings> {
    const s = loadStorage<AcademySettings>(SETTINGS_KEY, SETTINGS_MOCK);
    return mockResponse(
      s.popupMessage ?? {
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
    this.activePopup.set(popup);
    return mockResponse(popup);
  }

  /** POST /api/admin/payments/:id/approve — grants the entitlement server-side. */
  approve(id: string): void {
    this.setPayment(id, { status: 'approved', note: undefined });
  }

  /** POST /api/admin/payments/:id/reject { note } — the student is notified with the note. */
  reject(id: string, note: string): void {
    this.setPayment(id, { status: 'rejected', note });
  }

  /** Add newly submitted payment */
  addPayment(p: AdminPayment): void {
    this.payments.update((list) => {
      const updated = [p, ...list];
      saveStorage(PAYMENTS_KEY, updated);
      return updated;
    });
    window.dispatchEvent(new Event('storage'));
  }

  /** PUT /api/admin/lectures/:id (or POST for new) */
  saveLecture(l: AdminLecture): void {
    this.lectures.update((list) => {
      const updated = list.some((x) => x.id === l.id) ? list.map((x) => (x.id === l.id ? l : x)) : [l, ...list];
      saveStorage(LECTURES_KEY, updated);
      return updated;
    });
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('mutqin_lectures_updated'));
  }

  /** PUT /api/admin/live-sessions/:id (or POST for new) */
  saveLive(s: LiveClass): void {
    this.liveClasses.update((list) => {
      const updated = list.some((x) => x.id === s.id) ? list.map((x) => (x.id === s.id ? s : x)) : [...list, s];
      saveStorage(LIVE_KEY, updated);
      return updated;
    });
    window.dispatchEvent(new Event('storage'));
  }

  /** POST /api/admin/announcements */
  publish(a: Announcement): void {
    this.announcements.update((list) => {
      const updated = [a, ...list.filter((x) => x.id !== a.id)];
      saveStorage(ANNOUNCEMENTS_KEY, updated);
      return updated;
    });
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('mutqin_announcements_updated'));
  }

  deleteAnnouncement(id: string): void {
    this.announcements.update((list) => {
      const updated = list.filter((a) => a.id !== id);
      saveStorage(ANNOUNCEMENTS_KEY, updated);
      return updated;
    });
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('mutqin_announcements_updated'));
  }

  /** Add or invite a student */
  addStudent(student: AdminStudent): void {
    this.students.update((list) => {
      const updated = [student, ...list];
      saveStorage(STUDENTS_KEY, updated);
      return updated;
    });
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('mutqin_students_updated'));
  }

  /** Update student status */
  updateStudentStatus(id: string, status: UserStatus): void {
    this.students.update((list) => {
      const updated = list.map((s) => (s.id === id ? { ...s, status } : s));
      saveStorage(STUDENTS_KEY, updated);
      return updated;
    });
  }


  /** Add assistant metric */
  addAssistantMetric(metric: AssistantMetric): void {
    this.assistants.update((list) => {
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
    this.assistants.update((list) => {
      const updated = list.filter((x) => x.id !== id);
      saveStorage(ASSISTANTS_KEY, updated);
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
