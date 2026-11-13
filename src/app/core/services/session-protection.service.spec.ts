import { TestBed } from '@angular/core/testing';
import { SessionProtectionService } from './session-protection.service';

describe('SessionProtectionService (PBI-21 / AG-94 & AG-103)', () => {
  let service: SessionProtectionService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [SessionProtectionService],
    });
    service = TestBed.inject(SessionProtectionService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Signed Short-Lived Video Links (AG-99)', () => {
    it('TC-PROT-01: should generate signed link with user binding, expiry and hash token', () => {
      const raw = 'https://adelmostafa.com/video/lecture1.mp4';
      const signed = service.generateSignedVideoUrl(raw, 'u1', 600);

      expect(signed).toContain('sid=u1');
      expect(signed).toContain('exp=');
      expect(signed).toContain('sig=');
    });

    it('TC-PROT-02: should accept valid unexpired signed link for the correct student (200 OK)', () => {
      const raw = 'https://adelmostafa.com/video/lecture1.mp4';
      const signed = service.generateSignedVideoUrl(raw, 'u1', 600);
      const res = service.validateSignedVideoUrl(signed, 'u1');

      expect(res.valid).toBeTrue();
      expect(res.statusCode).toBe(200);
    });

    it('TC-PROT-03: should refuse expired signed link with 403 Forbidden', () => {
      const raw = 'https://adelmostafa.com/video/lecture1.mp4';
      // Negative TTL so it's already expired
      const signed = service.generateSignedVideoUrl(raw, 'u1', -10);
      const res = service.validateSignedVideoUrl(signed, 'u1');

      expect(res.valid).toBeFalse();
      expect(res.statusCode).toBe(403);
      expect(res.reason).toBe('expired');
    });

    it('TC-PROT-04: should refuse link copied to a different student with 403 Forbidden and flag suspicious activity', () => {
      const raw = 'https://adelmostafa.com/video/lecture1.mp4';
      const signed = service.generateSignedVideoUrl(raw, 'u1', 600);
      // Student u2 attempts to use u1's signed link
      const res = service.validateSignedVideoUrl(signed, 'u2');

      expect(res.valid).toBeFalse();
      expect(res.statusCode).toBe(403);
      expect(res.reason).toBe('user_mismatch');

      const flags = service.getSecurityFlags();
      expect(flags.some((f) => f.userId === 'u2' && f.reason.includes('u1'))).toBeTrue();
    });

    it('TC-PROT-05: should refuse tampered signature with 403 Forbidden', () => {
      const raw = 'https://adelmostafa.com/video/lecture1.mp4';
      const signed = service.generateSignedVideoUrl(raw, 'u1', 600);
      const tampered = signed.replace('sig=', 'sig=forged_token_');
      const res = service.validateSignedVideoUrl(tampered, 'u1');

      expect(res.valid).toBeFalse();
      expect(res.statusCode).toBe(403);
      expect(res.reason).toBe('invalid_signature');
    });
  });

  describe('Single Active Session & Concurrent Activity Flagging (AG-127)', () => {
    it('TC-PROT-06: should allow initial device session and maintain active status', () => {
      const res = service.registerViewingSession('u1', 'device_laptop');
      expect(res.session.status).toBe('active');
      expect(res.previousTerminated).toBeFalse();

      const hb = service.sessionHeartbeat('u1', 'device_laptop');
      expect(hb.active).toBeTrue();
    });

    it('TC-PROT-07: playing account on a second device terminates the first device stream and logs suspicious activity', () => {
      // 1. First device starts watching
      service.registerViewingSession('u1', 'device_laptop');

      // 2. Second device starts watching on the same student account
      const res2 = service.registerViewingSession('u1', 'device_phone');
      expect(res2.session.status).toBe('active');
      expect(res2.previousTerminated).toBeTrue();

      // 3. First device heartbeat is now rejected
      const hb1 = service.sessionHeartbeat('u1', 'device_laptop');
      expect(hb1.active).toBeFalse();
      expect(hb1.reason).toContain('another device');

      // 4. Suspicious event flagged for admin
      const flags = service.getSecurityFlags();
      expect(flags.some((f) => f.userId === 'u1' && f.reason.includes('Concurrent viewing'))).toBeTrue();
    });
  });

  describe('Dynamic Watermark (AG-101)', () => {
    it('TC-PROT-08: should format watermark with student ID, name and obscured phone number', () => {
      const wm = service.getWatermarkText('u1', 'Nour Saeed', '01012345678');
      expect(wm).toContain('ID: u1');
      expect(wm).toContain('Nour Saeed');
      expect(wm).toContain('010****5678');
      expect(wm).not.toContain('01012345678'); // Obscured
    });
  });
});
