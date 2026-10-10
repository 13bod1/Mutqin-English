import { TestBed } from '@angular/core/testing';
import { ProgressService } from './progress.service';
import { AuthService } from './auth.service';
import { SupabaseService } from '../supabase/supabase.service';
import { signal } from '@angular/core';

describe('ProgressService', () => {
  let service: ProgressService;
  let authMock: any;
  let supabaseMock: any;

  beforeEach(() => {
    authMock = {
      user: signal({
        id: 'usr_guest',
        fullName: 'Test Student',
        email: 'test@example.com',
        stage: 'sec3',
        initials: 'TS',
      }),
    };

    supabaseMock = {
      from: jasmine.createSpy('from').and.callFake(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: new Error('DB Error') }),
          }),
          order: () => ({
            limit: () => Promise.resolve({ data: null, error: new Error('DB Error') }),
          }),
        }),
        update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
        insert: () => Promise.resolve({ data: null, error: null }),
      })),
    };

    TestBed.configureTestingModule({
      providers: [
        ProgressService,
        { provide: AuthService, useValue: authMock },
        { provide: SupabaseService, useValue: supabaseMock },
      ],
    });

    service = TestBed.inject(ProgressService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return local profile for guest user', (done) => {
    service.getProfile().subscribe({
      next: (profile) => {
        expect(profile.fullName.en).toBe('Test Student');
        expect(profile.initials).toBe('TS');
        done();
      },
    });
  });

  it('should return default summary for new user', (done) => {
    service.getSummary().subscribe({
      next: (summary) => {
        expect(summary.cefrLevel).toBe('A1');
        expect(summary.quizzesCompleted).toBe(0);
        expect(summary.studyHours).toBe(0);
        done();
      },
    });
  });

  it('should return leaderboard with Egyptian cohort and current user', (done) => {
    service.getLeaderboard().subscribe({
      next: (leaderboard) => {
        expect(leaderboard.length).toBeGreaterThan(0);
        const me = leaderboard.find(e => e.isCurrentUser);
        expect(me).toBeTruthy();
        expect(me!.xp).toBe(0);
        done();
      },
    });
  });

  it('should return empty achievements for guest user', (done) => {
    service.getAchievements().subscribe({
      next: (achievements) => {
        expect(achievements).toEqual([]);
        done();
      },
    });
  });
});
