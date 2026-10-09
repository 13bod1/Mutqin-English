import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ACHIEVEMENTS_MOCK, LEADERBOARD_MOCK, PROGRESS_SUMMARY_MOCK, STUDENT_PROFILE_MOCK } from '../mock/progress.mock';
import { Achievement, LeaderboardEntry, ProgressSummary, StudentProfile } from '../models/progress';
import { mockResponse } from './mock-response';

/** Signed-in student's dashboard. TODO(backend): replace mocks with HttpClient calls. */
@Injectable({ providedIn: 'root' })
export class ProgressService {
  /** GET /api/me/profile */
  getProfile(): Observable<StudentProfile> {
    return mockResponse(STUDENT_PROFILE_MOCK);
  }

  /** GET /api/me/progress */
  getSummary(): Observable<ProgressSummary> {
    return mockResponse(PROGRESS_SUMMARY_MOCK);
  }

  /** GET /api/leaderboard?scope=national&period=week */
  getLeaderboard(): Observable<LeaderboardEntry[]> {
    return mockResponse(LEADERBOARD_MOCK);
  }

  /** GET /api/me/achievements */
  getAchievements(): Observable<Achievement[]> {
    return mockResponse(ACHIEVEMENTS_MOCK);
  }
}
