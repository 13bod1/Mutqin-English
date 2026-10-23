import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { CHAT_MOCK } from '../mock/live.mock';
import { ChatMessage, LiveClass } from '../models/live';
import { AdminService } from './admin.service';
import { AuthService } from './auth.service';
import { mockResponse } from './mock-response';

/**
 * Live classes shown on the site (student + teacher views).
 * Dynamically synchronized with Admin Dashboard.
 */
@Injectable({ providedIn: 'root' })
export class LiveClassService {
  private readonly auth = inject(AuthService);
  private readonly admin = inject(AdminService);

  /** GET /api/live-sessions — public list, dynamically sourced from Admin Dashboard */
  getAll(): Observable<LiveClass[]> {
    const list = this.admin.liveClasses();
    const safe = list.map((s) => ({ ...s, playbackUrl: undefined }));
    return mockResponse(safe);
  }

  /**
   * GET /api/live-sessions/:id
   * - Staff (admin/assistant) always receive the playbackUrl.
   * - Students receive playbackUrl only if they have purchased the session.
   */
  getById(id: string): Observable<LiveClass | null> {
    const session = this.admin.liveClasses().find((s) => s.id === id) ?? null;
    if (!session) return mockResponse(null);

    const user = this.auth.user();

    // Staff always have full access
    if (this.auth.isStaff()) {
      return mockResponse(session);
    }

    // Session without a stream URL (ended / no URL set) — return as-is
    if (!session.playbackUrl) {
      return mockResponse({ ...session, playbackUrl: undefined });
    }

    // Check if the student has purchased this session in localStorage or mock
    let hasPurchased = false;
    try {
      const raw = localStorage.getItem('mutqin_user_purchases');
      if (raw) {
        const list = JSON.parse(raw);
        hasPurchased = list.some((p: any) => p.kind === 'live' && p.itemId === id);
      }
    } catch {}

    if (!hasPurchased && session.access?.type === 'paid' && user) {
      return throwError(() => ({
        status: 403,
        message: 'Access denied: purchase this session to watch the live stream.',
        session: { ...session, playbackUrl: undefined },
      }));
    }

    // Free / included sessions or purchased sessions
    if (!user) {
      // Guest — hide the URL
      return mockResponse({ ...session, playbackUrl: undefined });
    }

    return mockResponse(session);
  }

  /** GET /api/live-sessions/:id/chat (then Realtime subscription) */
  getChat(id: string): Observable<ChatMessage[]> {
    return mockResponse(id === 'phrasal-verbs' ? CHAT_MOCK.slice(1) : CHAT_MOCK);
  }
}
