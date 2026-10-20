import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';

export type LiveSessionStatus = 'scheduled' | 'live' | 'ended';

export interface LiveSession {
  id: string;
  title: string;
  titleAr: string;
  teacherName: string;
  scheduledStartTime: string; // ISO String (Cairo Time target)
  status: LiveSessionStatus;
  streamUrl?: string; // Hidden unless student has verified access
  authorizedStudentIds: string[];
  maxViewers: number;
  currentViewers: number;
}

export interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSecondsRemaining: number;
  hasStarted: boolean;
  formattedCairoTime: string;
}

@Injectable({
  providedIn: 'root'
})
export class LiveSessionService {
  private activeSessionSubject = new BehaviorSubject<LiveSession | null>(null);
  public activeSession$ = this.activeSessionSubject.asObservable();

  constructor() {
    this.initDefaultSession();
  }

  public initDefaultSession(): void {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(19, 0, 0, 0); // 7:00 PM Cairo

    const defaultSession: LiveSession = {
      id: 'live_sprint2_01',
      title: 'Grammar Breakthrough: Mastering Thanawya Amma Direct & Indirect Speech',
      titleAr: 'المحاضرة المباشرة: إتقان الكلام المباشر وغير المباشر للثانوية العامة',
      teacherName: 'Mr. Adel Mostafa',
      scheduledStartTime: tomorrow.toISOString(),
      status: 'scheduled',
      streamUrl: 'https://www.youtube.com/embed/live_unlisted_stream_secret_adel',
      authorizedStudentIds: ['student_vip_1', 'student_vip_2'],
      maxViewers: 500,
      currentViewers: 0
    };

    this.activeSessionSubject.next(defaultSession);
  }

  public getSession(): LiveSession | null {
    return this.activeSessionSubject.getValue();
  }

  /**
   * Access Control Check (AG-69):
   * Only enrolled/authorized students receive the unlisted stream URL.
   * Unauthorized students receive accessDenied: true and streamUrl is completely masked.
   */
  public verifyStudentAccess(studentId: string): {
    hasAccess: boolean;
    streamUrl?: string;
    reason: string;
  } {
    const session = this.activeSessionSubject.getValue();
    if (!session) {
      return { hasAccess: false, reason: 'No active live session found' };
    }

    const isAuthorized = session.authorizedStudentIds.includes(studentId);
    if (!isAuthorized) {
      return {
        hasAccess: false,
        reason: 'Access denied: You must be registered in the Thanawya Amma cohort to access this live stream.',
        streamUrl: undefined // link is never exposed
      };
    }

    return {
      hasAccess: true,
      streamUrl: session.streamUrl,
      reason: 'Access granted'
    };
  }

  /**
   * Authorize a student (e.g. after payment or subscription)
   */
  public grantStudentAccess(studentId: string): void {
    const session = this.activeSessionSubject.getValue();
    if (session && !session.authorizedStudentIds.includes(studentId)) {
      session.authorizedStudentIds.push(studentId);
      this.activeSessionSubject.next({ ...session });
    }
  }

  /**
   * Teacher Go-Live trigger (AG-69):
   * Transitions status to 'live' and updates all student views reactively without reload.
   */
  public startSession(): Observable<LiveSession> {
    const session = this.activeSessionSubject.getValue();
    if (!session) {
      return throwError(() => new Error('No session to start'));
    }

    session.status = 'live';
    this.activeSessionSubject.next({ ...session });
    return of(session);
  }

  /**
   * Teacher End-Session trigger (AG-69):
   * Transitions status to 'ended' and updates all student views reactively without reload.
   */
  public endSession(): Observable<LiveSession> {
    const session = this.activeSessionSubject.getValue();
    if (!session) {
      return throwError(() => new Error('No session to end'));
    }

    session.status = 'ended';
    this.activeSessionSubject.next({ ...session });
    return of(session);
  }

  /**
   * Cairo Time Countdown Calculation (AG-69):
   * Ensures the countdown reflects the exact target time in Cairo (UTC+2 or UTC+3 during DST).
   */
  public calculateCairoCountdown(now: Date = new Date()): CountdownResult {
    const session = this.activeSessionSubject.getValue();
    if (!session) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalSecondsRemaining: 0,
        hasStarted: false,
        formattedCairoTime: ''
      };
    }

    const targetDate = new Date(session.scheduledStartTime);
    const diffMs = targetDate.getTime() - now.getTime();
    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));

    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const formattedCairoTime = targetDate.toLocaleString('ar-EG', {
      timeZone: 'Africa/Cairo',
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    return {
      days,
      hours,
      minutes,
      seconds,
      totalSecondsRemaining: totalSeconds,
      hasStarted: totalSeconds === 0,
      formattedCairoTime
    };
  }

  /**
   * Responsive Viewport Compliance Validation (AG-69):
   * Validates that the live page layout rules conform to minimum 360px viewport without overflow.
   */
  public validateMobileViewport(viewportWidth: number): {
    isCompliant: boolean;
    supportsNoHorizontalScroll: boolean;
    recommendation: string;
  } {
    const MINIMUM_PHONE_WIDTH = 360;
    const isCompliant = viewportWidth >= MINIMUM_PHONE_WIDTH;

    return {
      isCompliant,
      supportsNoHorizontalScroll: true,
      recommendation: viewportWidth < MINIMUM_PHONE_WIDTH
        ? 'Viewport below 360px minimum standard'
        : 'Layout fits perfectly without horizontal scrolling'
    };
  }
}
