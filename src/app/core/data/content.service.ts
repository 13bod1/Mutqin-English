import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { INSTRUCTOR_MOCK, PLATFORM_STATS_MOCK, TESTIMONIALS_MOCK } from '../mock/content.mock';
import { Instructor, PlatformStats, Testimonial } from '../models/content';
import { mockResponse } from './mock-response';

/** Public marketing content. TODO(backend): replace mocks with HttpClient calls. */
@Injectable({ providedIn: 'root' })
export class ContentService {
  /** GET /api/platform/stats */
  getPlatformStats(): Observable<PlatformStats> {
    return mockResponse(PLATFORM_STATS_MOCK);
  }

  /** GET /api/instructors/featured */
  getFeaturedInstructor(): Observable<Instructor> {
    return mockResponse(INSTRUCTOR_MOCK);
  }

  /** GET /api/testimonials */
  getTestimonials(): Observable<Testimonial[]> {
    return mockResponse(TESTIMONIALS_MOCK);
  }
}
