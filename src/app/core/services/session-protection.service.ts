import { Injectable, signal } from '@angular/core';
import { SecurityFlag, ViewingSession } from '../models/sprint3';

export interface SignedUrlValidationResult {
  valid: boolean;
  statusCode: 200 | 403;
  reason?: 'expired' | 'user_mismatch' | 'invalid_signature' | 'malformed';
}

@Injectable({
  providedIn: 'root',
})
export class SessionProtectionService {
  private readonly secretKey = 'adel-mostafa-drm-signing-key-2026';
  
  // Storage for viewing sessions and security flags
  private viewingSessions: ViewingSession[] = [];
  private securityFlags: SecurityFlag[] = [];
  
  // Signal for the current client's playback termination event
  readonly activeSessionTerminated = signal<string | null>(null);

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const storedSessions = localStorage.getItem('mutqin_viewing_sessions');
      if (storedSessions) this.viewingSessions = JSON.parse(storedSessions);
      const storedFlags = localStorage.getItem('mutqin_security_flags');
      if (storedFlags) this.securityFlags = JSON.parse(storedFlags);
    } catch {}
  }

  private persistState(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem('mutqin_viewing_sessions', JSON.stringify(this.viewingSessions));
      localStorage.setItem('mutqin_security_flags', JSON.stringify(this.securityFlags));
    } catch {}
  }

  /**
   * Generates a signed, short-lived video playback URL tied to the student ID.
   * Default expiration: 10 minutes (600 seconds).
   */
  generateSignedVideoUrl(rawUrl: string, studentId: string, ttlSeconds = 600): string {
    const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
    const payload = `${studentId}:${rawUrl}:${expiresAt}`;
    const token = this.simpleHash(payload + this.secretKey);

    const separator = rawUrl.includes('?') ? '&' : '?';
    return `${rawUrl}${separator}sid=${encodeURIComponent(studentId)}&exp=${expiresAt}&sig=${token}`;
  }

  /**
   * Validates a signed video URL against current student ID and expiration timestamp.
   * Acceptance Criteria: A copied, expired, or mismatched link is refused (403).
   */
  validateSignedVideoUrl(signedUrl: string, studentId: string): SignedUrlValidationResult {
    try {
      const url = new URL(signedUrl, 'https://adelmostafa.com');
      const urlStudentId = url.searchParams.get('sid');
      const expStr = url.searchParams.get('exp');
      const sig = url.searchParams.get('sig');

      if (!urlStudentId || !expStr || !sig) {
        return { valid: false, statusCode: 403, reason: 'malformed' };
      }

      // 1. Verify user binding
      if (urlStudentId !== studentId) {
        this.flagSuspiciousActivity(
          studentId,
          `Attempted to access video stream signed for student '${urlStudentId}'`
        );
        return { valid: false, statusCode: 403, reason: 'user_mismatch' };
      }

      // 2. Verify expiration
      const exp = parseInt(expStr, 10);
      const now = Math.floor(Date.now() / 1000);
      if (now > exp) {
        return { valid: false, statusCode: 403, reason: 'expired' };
      }

      // 3. Verify cryptographic token signature
      const rawBase = signedUrl.substring(0, signedUrl.indexOf('?sid=') !== -1 ? signedUrl.indexOf('?sid=') : signedUrl.indexOf('&sid='));
      const expectedPayload = `${urlStudentId}:${rawBase}:${exp}`;
      const expectedSig = this.simpleHash(expectedPayload + this.secretKey);

      if (sig !== expectedSig) {
        this.flagSuspiciousActivity(studentId, 'Invalid or forged video stream signature token');
        return { valid: false, statusCode: 403, reason: 'invalid_signature' };
      }

      return { valid: true, statusCode: 200 };
    } catch {
      return { valid: false, statusCode: 403, reason: 'malformed' };
    }
  }

  /**
   * Registers a viewing session.
   * Rule: Only ONE active viewing session per account.
   * If a second device joins, the earlier active session is terminated, and a suspicious-activity flag is logged.
   */
  registerViewingSession(userId: string, deviceId: string): { session: ViewingSession; previousTerminated: boolean } {
    const now = new Date().toISOString();
    let previousTerminated = false;

    // Check for existing active sessions for this student on other devices
    const existingActive = this.viewingSessions.filter(
      (s) => s.userId === userId && s.status === 'active' && s.deviceId !== deviceId
    );

    if (existingActive.length > 0) {
      previousTerminated = true;
      existingActive.forEach((s) => {
        s.status = 'stopped';
        s.lastSeenAt = now;
      });

      this.flagSuspiciousActivity(
        userId,
        `Concurrent viewing session attempt from device '${deviceId}'. Prior session(s) terminated.`
      );

      // Notify clients
      this.activeSessionTerminated.set(
        `Playback paused: Your account started viewing on another device (${deviceId.slice(0, 8)}...).`
      );
    }

    // Find or create current device session
    let current = this.viewingSessions.find((s) => s.userId === userId && s.deviceId === deviceId);
    if (!current) {
      current = {
        id: 'vs_' + Math.random().toString(36).substring(2, 9),
        userId,
        deviceId,
        startedAt: now,
        lastSeenAt: now,
        status: 'active',
      };
      this.viewingSessions.push(current);
    } else {
      current.status = 'active';
      current.lastSeenAt = now;
    }

    this.persistState();
    return { session: current, previousTerminated };
  }

  /**
   * Heartbeat to verify session is still active.
   * If another device took over, this returns active: false.
   */
  sessionHeartbeat(userId: string, deviceId: string): { active: boolean; reason?: string } {
    const s = this.viewingSessions.find((item) => item.userId === userId && item.deviceId === deviceId);
    if (!s || s.status === 'stopped') {
      return {
        active: false,
        reason: 'Session stopped because playback started on another device.',
      };
    }
    s.lastSeenAt = new Date().toISOString();
    this.persistState();
    return { active: true };
  }

  /**
   * Explicitly stop/close a viewing session when student leaves or pauses.
   */
  stopViewingSession(userId: string, deviceId: string): void {
    const s = this.viewingSessions.find((item) => item.userId === userId && item.deviceId === deviceId);
    if (s) {
      s.status = 'stopped';
      s.lastSeenAt = new Date().toISOString();
      this.persistState();
    }
  }

  /**
   * Flags suspicious account activity for admin review.
   */
  flagSuspiciousActivity(userId: string, reason: string): SecurityFlag {
    const flag: SecurityFlag = {
      id: 'flag_' + Math.random().toString(36).substring(2, 9),
      userId,
      reason,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    this.securityFlags.unshift(flag);
    this.persistState();
    return flag;
  }

  getSecurityFlags(): SecurityFlag[] {
    return [...this.securityFlags];
  }

  clearSecurityFlag(flagId: string): void {
    const f = this.securityFlags.find((item) => item.id === flagId);
    if (f) {
      f.status = 'cleared';
      this.persistState();
    }
  }

  /**
   * Generates dynamic watermark text containing student identifier and masked phone number.
   * Example: "Adel Mostafa Academy • ID: u1 (Nour Saeed) • 010****5678"
   */
  getWatermarkText(userId: string, studentName = 'Student', phone = '01012345678'): string {
    const maskedPhone = phone.length >= 7 
      ? phone.substring(0, 3) + '****' + phone.substring(phone.length - 4) 
      : phone;
    return `Adel Mostafa Platform • ID: ${userId} (${studentName}) • ${maskedPhone}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }
}
