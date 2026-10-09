import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CONTINUE_WATCHING_MOCK, FEATURED_LECTURE_MOCK, LECTURES_MOCK } from '../mock/lectures.mock';
import { ContinueWatchingItem, DurationBucket, FeaturedLecture, Lecture, LectureFilters } from '../models/lecture';
import { Lang } from '../models/localized';
import { mockResponse } from './mock-response';

/** Recorded lectures. TODO(backend): replace mocks with HttpClient calls. */
@Injectable({ providedIn: 'root' })
export class LectureService {
  /** GET /api/lectures */
  getLectures(): Observable<Lecture[]> {
    return mockResponse(LECTURES_MOCK);
  }

  /** GET /api/me/continue-watching */
  getContinueWatching(): Observable<ContinueWatchingItem[]> {
    return mockResponse(CONTINUE_WATCHING_MOCK);
  }

  /** GET /api/lectures/featured */
  getFeaturedLecture(): Observable<FeaturedLecture> {
    return mockResponse(FEATURED_LECTURE_MOCK);
  }
}

export function durationBucket(minutes: number): DurationBucket {
  if (minutes < 15) return 'short';
  if (minutes <= 30) return 'medium';
  return 'long';
}

/** Client-side filtering; the backend can take over with query params later. */
export function filterLectures(lectures: Lecture[], f: LectureFilters, lang: Lang): Lecture[] {
  const q = f.query.trim().toLowerCase();
  return lectures.filter((l) => {
    if (f.stage && l.stage !== f.stage) return false;
    if (f.topic && l.topic !== f.topic) return false;
    if (f.duration && durationBucket(l.durationMin) !== f.duration) return false;
    if (!q) return true;
    const haystack = [l.title, l.description, l.unit, l.instructor]
      .flatMap((t) => [t[lang], t.en])
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}
