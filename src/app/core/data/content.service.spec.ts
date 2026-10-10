import { TestBed } from '@angular/core/testing';
import { ContentService } from './content.service';
import { SupabaseService } from '../supabase/supabase.service';
import { PLATFORM_STATS_MOCK, INSTRUCTOR_MOCK, TESTIMONIALS_MOCK } from '../mock/content.mock';

describe('ContentService', () => {
  let service: ContentService;
  let supabaseMock: any;

  beforeEach(() => {
    const createChain = () => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        order: () => Promise.resolve({ data: null, error: new Error('DB Error') }),
        limit: () => chain,
        single: () => Promise.resolve({ data: null, error: new Error('DB Error') }),
        maybeSingle: () => Promise.resolve({ data: null, error: new Error('DB Error') }),
      };
      return chain;
    };
    supabaseMock = {
      from: jasmine.createSpy('from').and.callFake(() => createChain()),
    };

    TestBed.configureTestingModule({
      providers: [
        ContentService,
        { provide: SupabaseService, useValue: supabaseMock },
      ],
    });

    service = TestBed.inject(ContentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return platform stats fallback on DB error', (done) => {
    service.getPlatformStats().subscribe({
      next: (stats) => {
        expect(stats).toEqual(PLATFORM_STATS_MOCK);
        done();
      },
    });
  });

  it('should return featured instructor fallback on DB error', (done) => {
    service.getFeaturedInstructor().subscribe({
      next: (inst) => {
        expect(inst).toEqual(INSTRUCTOR_MOCK);
        done();
      },
    });
  });

  it('should return testimonials mock fallback on DB error', (done) => {
    service.getTestimonials().subscribe({
      next: (testimonials) => {
        expect(testimonials).toEqual(TESTIMONIALS_MOCK);
        done();
      },
    });
  });

  it('should return introductory video fallback on DB error', (done) => {
    service.getIntroductoryVideo().subscribe({
      next: (video) => {
        expect(video).toBeTruthy();
        expect(video.slug).toBe('intro');
        done();
      },
    });
  });
});
