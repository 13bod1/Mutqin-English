import { TestBed } from '@angular/core/testing';
import { GuardianReportService } from './guardian-report.service';

describe('GuardianReportService (PBI-23 / AG-96 & AG-131)', () => {
  let service: GuardianReportService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [GuardianReportService],
    });
    service = TestBed.inject(GuardianReportService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Report Retrieval & Expiration (AG-126 & AG-129)', () => {
    it('TC-GRD-01: should retrieve active weekly progress report by secure token hash', () => {
      const validToken = 'tok_nour_saeed_7d_valid_hash_98a72b1';
      const result = service.getReportByToken(validToken);

      expect(result.status).toBe('ok');
      expect(result.report).toBeDefined();
      expect(result.report?.data.studentName).toBe('Nour Saeed');
      expect(result.report?.data.attendanceRate).toBe(100);
      expect(result.report?.data.quizAverage).toBe(94);
      expect(result.report?.data.quizzes.length).toBeGreaterThan(0);
      expect(result.report?.isExpired).toBeFalse();
    });

    it('TC-GRD-02: should strictly enforce 7-day expiration and refuse expired report links', () => {
      const expiredToken = 'tok_youssef_hany_expired_hash_12c44d';
      const result = service.getReportByToken(expiredToken);

      expect(result.status).toBe('expired');
      expect(result.report?.isExpired).toBeTrue();
      expect(result.errorMessage?.en).toContain('expired');
    });

    it('TC-GRD-03: IDOR protection: random invalid or unissued tokens return not_found and never leak another student', () => {
      const forgedToken = 'tok_attacker_guessing_id_99999';
      const result = service.getReportByToken(forgedToken);

      expect(result.status).toBe('not_found');
      expect(result.report).toBeNull();
    });

    it('TC-GRD-04: admin master switch should disable reports when turned off', () => {
      service.setReportsEnabled(false);
      const validToken = 'tok_nour_saeed_7d_valid_hash_98a72b1';
      const result = service.getReportByToken(validToken);

      expect(result.status).toBe('disabled');
      expect(result.report).toBeNull();
      expect(result.errorMessage?.en).toContain('currently disabled');
    });
  });

  describe('Guardian Contact Management & Privacy (AG-125)', () => {
    it('TC-GRD-05: should save and retrieve guardian contact info, and delete upon request', () => {
      const contact = {
        name: 'Ahmed Saeed',
        phone: '01012345678',
        email: 'ahmed.saeed@gmail.com',
      };

      // 1. Save
      service.saveGuardianContact('u1', contact);
      const retrieved = service.getGuardianContact('u1');
      expect(retrieved?.name).toBe('Ahmed Saeed');
      expect(retrieved?.phone).toBe('01012345678');

      // 2. Delete on request
      service.deleteGuardianContact('u1');
      const afterDelete = service.getGuardianContact('u1');
      expect(afterDelete).toBeNull();
    });
  });
});
