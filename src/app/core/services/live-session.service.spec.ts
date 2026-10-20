import { TestBed } from '@angular/core/testing';
import { LiveSessionService, LiveSession } from './live-session.service';

describe('LiveSessionService (QA Automated Test Suite - AG-69)', () => {
  let service: LiveSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LiveSessionService);
    service.initDefaultSession();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Access Control & Stream Link Protection (AG-69)', () => {
    it('TC-LIVE-01: should deny access and withhold stream URL from unauthorized students', () => {
      const result = service.verifyStudentAccess('unauthorized_student_99');
      expect(result.hasAccess).toBeFalse();
      expect(result.streamUrl).toBeUndefined();
      expect(result.reason).toContain('Access denied');
    });

    it('TC-LIVE-02: should grant access and expose stream URL only to authorized cohort students', () => {
      // 'student_vip_1' is pre-authorized
      const result = service.verifyStudentAccess('student_vip_1');
      expect(result.hasAccess).toBeTrue();
      expect(result.streamUrl).toBeDefined();
      expect(result.streamUrl).toContain('live_unlisted_stream_secret_adel');
    });

    it('TC-LIVE-03: should allow dynamic access grant (e.g. after successful payment checkout)', () => {
      const studentId = 'student_new_subscriber';
      expect(service.verifyStudentAccess(studentId).hasAccess).toBeFalse();

      service.grantStudentAccess(studentId);
      const updated = service.verifyStudentAccess(studentId);
      expect(updated.hasAccess).toBeTrue();
      expect(updated.streamUrl).toBeDefined();
    });
  });

  describe('Scheduled Countdown Logic (AG-69)', () => {
    it('TC-LIVE-04: should calculate accurate countdown to scheduled session time in Cairo timezone', () => {
      const now = new Date();
      const countdown = service.calculateCairoCountdown(now);
      expect(countdown.totalSecondsRemaining).toBeGreaterThan(0);
      expect(countdown.hasStarted).toBeFalse();
      expect(countdown.formattedCairoTime).toBeTruthy();
    });

    it('TC-LIVE-05: should mark hasStarted as true when current time meets or passes scheduled start', () => {
      const pastTime = new Date(Date.now() + 48 * 3600 * 1000); // 48h in future, so session is in the past
      const countdown = service.calculateCairoCountdown(pastTime);
      expect(countdown.totalSecondsRemaining).toBe(0);
      expect(countdown.hasStarted).toBeTrue();
    });
  });

  describe('Reactive State Transitions Without Full Reload (AG-69)', () => {
    it('TC-LIVE-06: should reactively transition from scheduled to live state when teacher starts session', (done) => {
      let stateEmissionCount = 0;
      service.activeSession$.subscribe((session) => {
        stateEmissionCount++;
        if (stateEmissionCount === 2) {
          expect(session?.status).toBe('live');
          done();
        }
      });

      service.startSession().subscribe((updated) => {
        expect(updated.status).toBe('live');
      });
    });

    it('TC-LIVE-07: should reactively transition to ended state when teacher ends session', (done) => {
      service.startSession().subscribe(() => {
        service.endSession().subscribe((ended) => {
          expect(ended.status).toBe('ended');
          const current = service.getSession();
          expect(current?.status).toBe('ended');
          done();
        });
      });
    });
  });

  describe('Mobile Viewport & Cross-Device Compatibility (AG-69)', () => {
    it('TC-LIVE-08: should validate layout compatibility at 360px mobile viewport without horizontal scroll', () => {
      const mobileCheck = service.validateMobileViewport(360);
      expect(mobileCheck.isCompliant).toBeTrue();
      expect(mobileCheck.supportsNoHorizontalScroll).toBeTrue();
    });

    it('TC-LIVE-09: should support tablet and desktop viewports seamlessly', () => {
      const desktopCheck = service.validateMobileViewport(1280);
      expect(desktopCheck.isCompliant).toBeTrue();
    });
  });
});
