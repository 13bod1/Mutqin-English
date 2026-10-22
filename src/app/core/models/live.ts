import { Access } from './commerce';
import { AcademicStage } from './lecture';
import { LocalizedText } from './localized';

export type LiveStatus = 'scheduled' | 'live' | 'ended';

/** A live class streamed on the site itself (GET /api/live-sessions). */
export interface LiveClass {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  stage: AcademicStage;
  /** ISO date-time; displayed in Africa/Cairo. */
  startsAt: string;
  durationMin: number;
  status: LiveStatus;
  access: Access;
  seatsTaken: number;
  maxSeats: number;
  /** Set while live. */
  viewers?: number;
  /** HLS playback URL — only returned by the API to students with access. */
  playbackUrl?: string;
  /** Set once ended. */
  replayUntil?: string;
  stats?: { durationMin: number; attended: number; questions: number };
}

export interface ChatMessage {
  id: string;
  author: string;
  initials: string;
  text: string;
  /** ISO time */
  at: string;
  teacher?: boolean;
  pinned?: boolean;
}
