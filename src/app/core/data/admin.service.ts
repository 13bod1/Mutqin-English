import { Injectable, computed, signal } from '@angular/core';
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
import { AcademySettings, AdminLecture, AdminPayment, Announcement } from '../models/admin';
import { LiveClass } from '../models/live';
import { mockResponse } from './mock-response';

/**
 * Data for the admin panel. Placeholder store backed by mocks; every mutation names the endpoint
 * the backend team needs to expose. All writes must be authorised server-side (RLS on profiles.role).
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  readonly students = signal(STUDENTS_MOCK);
  readonly staff = signal(STAFF_MOCK);
  readonly payments = signal(PAYMENTS_MOCK);
  readonly lectures = signal(ADMIN_LECTURES_MOCK);
  readonly liveClasses = signal<LiveClass[]>(LIVE_CLASSES_MOCK);
  readonly announcements = signal(ANNOUNCEMENTS_MOCK);
  readonly assistants = signal(ASSISTANT_METRICS_MOCK);
  readonly weeklyActivity = WEEKLY_ACTIVITY_MOCK;
  readonly enrollments = ENROLLMENTS_MOCK;

  /** Totals shown on cards. Real values come from GET /api/admin/stats. */
  readonly totals = { students: 347, maxSeats: 400, activeWeek: 281, invites: 9, suspended: 3, revenueOct: 96250, paidOct: 275, viewsOct: 9412, watchHours: 1286, avgQuiz: 81, quizAttempts: 1940, published: 38, storageGb: 46, storagePlanGb: 100 };

  readonly pendingCount = computed(() => this.payments().filter((p) => p.status === 'pending').length);

  /** GET /api/admin/settings */
  getSettings(): Observable<AcademySettings> {
    return mockResponse(SETTINGS_MOCK);
  }

  /** PUT /api/admin/settings */
  saveSettings(s: AcademySettings): Observable<AcademySettings> {
    Object.assign(SETTINGS_MOCK, s);
    return mockResponse(s);
  }

  /** POST /api/admin/payments/:id/approve — grants the entitlement server-side. */
  approve(id: string): void {
    this.setPayment(id, { status: 'approved', note: undefined });
  }

  /** POST /api/admin/payments/:id/reject { note } — the student is notified with the note. */
  reject(id: string, note: string): void {
    this.setPayment(id, { status: 'rejected', note });
  }

  /** PUT /api/admin/lectures/:id (or POST for new) */
  saveLecture(l: AdminLecture): void {
    this.lectures.update((list) => (list.some((x) => x.id === l.id) ? list.map((x) => (x.id === l.id ? l : x)) : [l, ...list]));
  }

  /** PUT /api/admin/live-sessions/:id (or POST for new) */
  saveLive(s: LiveClass): void {
    this.liveClasses.update((list) => (list.some((x) => x.id === s.id) ? list.map((x) => (x.id === s.id ? s : x)) : [...list, s]));
  }

  /** POST /api/admin/announcements */
  publish(a: Announcement): void {
    this.announcements.update((list) => [a, ...list]);
  }

  private setPayment(id: string, patch: Partial<AdminPayment>): void {
    this.payments.update((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
}
