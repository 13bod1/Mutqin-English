import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { CHAT_MOCK, LIVE_CLASSES_MOCK, PURCHASES_MOCK } from '../mock/live.mock';
import { ChatMessage, LiveClass } from '../models/live';
import { AuthService } from './auth.service';
import { mockResponse } from './mock-response';

/**
 * Live classes shown on the site (student + teacher views).
 * Access control: playbackUrl is only returned to students who have purchased the session.
 * Unauthorized access returns a 403-like error.
 *
 * Backend plan: Supabase table `live_sessions` + Mux live streams; chat via Supabase Realtime.
 */
@Injectable({ providedIn: 'root' })
export class LiveClassService {
  private readonly auth = inject(AuthService);

  /** GET /api/live-sessions — public list, never exposes playbackUrl */
  getAll(): Observable<LiveClass[]> {
    const safe = LIVE_CLASSES_MOCK.map((s) => ({ ...s, playbackUrl: undefined }));
    return mockResponse(safe);
  }

  /**
   * GET /api/live-sessions/:id
   * - Staff (admin/assistant) always receive the playbackUrl.
   * - Students receive playbackUrl only if they have purchased the session.
   * - Unauthorized students get a 403 error — the URL is never exposed.
   */
  getById(id: string): Observable<LiveClass | null> {
    const session = LIVE_CLASSES_MOCK.find((s) => s.id === id) ?? null;
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

    // Check if the student has purchased this session
    const hasPurchased = PURCHASES_MOCK.some(
      (p) => p.kind === 'live' && p.itemId === id
    );

    if (!hasPurchased && user) {
      // Return session metadata but 403 the stream link
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
