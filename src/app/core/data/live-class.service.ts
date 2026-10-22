import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CHAT_MOCK, LIVE_CLASSES_MOCK } from '../mock/live.mock';
import { ChatMessage, LiveClass } from '../models/live';
import { mockResponse } from './mock-response';

/**
 * Live classes shown on the site (student + teacher views).
 * Backend plan: Supabase table `live_sessions` + Mux live streams; chat via Supabase Realtime.
 */
@Injectable({ providedIn: 'root' })
export class LiveClassService {
  /** GET /api/live-sessions */
  getAll(): Observable<LiveClass[]> {
    return mockResponse(LIVE_CLASSES_MOCK);
  }

  /** GET /api/live-sessions/:id */
  getById(id: string): Observable<LiveClass | null> {
    return mockResponse(LIVE_CLASSES_MOCK.find((s) => s.id === id) ?? null);
  }

  /** GET /api/live-sessions/:id/chat (then Realtime subscription) */
  getChat(id: string): Observable<ChatMessage[]> {
    return mockResponse(id === 'phrasal-verbs' ? CHAT_MOCK.slice(1) : CHAT_MOCK);
  }
}
