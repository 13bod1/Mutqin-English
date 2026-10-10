import { TestBed } from '@angular/core/testing';
import { LectureService, durationBucket, filterLectures } from './lecture.service';
import { SupabaseService } from '../supabase/supabase.service';
import { LECTURES_MOCK } from '../mock/lectures.mock';
import { Lecture, LectureFilters } from '../models/lecture';

describe('LectureService & Helper Functions', () => {
  let service: LectureService;
  let supabaseMock: any;

  beforeEach(() => {
    supabaseMock = {
      from: jasmine.createSpy('from').and.callFake(() => ({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: null, error: new Error('DB Error') }),
            limit: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: new Error('DB Error') }),
            }),
          }),
        }),
      })),
    };

    TestBed.configureTestingModule({
      providers: [
        LectureService,
        { provide: SupabaseService, useValue: supabaseMock },
      ],
    });

    service = TestBed.inject(LectureService);
  });

  it('should return lectures mock on error', (done) => {
    service.getLectures().subscribe({
      next: (lectures) => {
        expect(lectures).toEqual(LECTURES_MOCK);
        done();
      },
    });
  });

  it('should return continue watching mock', (done) => {
    service.getContinueWatching().subscribe({
      next: (items) => {
        expect(items.length).toBeGreaterThan(0);
        done();
      },
    });
  });

  it('should return featured lecture mock on error', (done) => {
    service.getFeaturedLecture().subscribe({
      next: (featured) => {
        expect(featured).toBeTruthy();
        done();
      },
    });
  });

  describe('durationBucket', () => {
    it('should categorize minutes into short, medium, and long buckets', () => {
      expect(durationBucket(10)).toBe('short');
      expect(durationBucket(15)).toBe('medium');
      expect(durationBucket(30)).toBe('medium');
      expect(durationBucket(45)).toBe('long');
    });
  });

  describe('filterLectures', () => {
    const mockLectures: Lecture[] = [
      {
        id: 'l1',
        title: { en: 'Grammar Essentials', ar: 'أساسيات القواعد' },
        description: { en: 'Basic grammar intro', ar: 'مقدمة القواعد' },
        unit: { en: 'Unit 1', ar: 'الوحدة 1' },
        stage: 'sec1',
        topic: 'grammar',
        durationMin: 10,
        instructor: { en: 'Mr. Adel', ar: 'أ. عادل' },
        resources: { en: 'Notes', ar: 'ملاحظات' },
        order: 1,
        videoUrl: 'http://video1.mp4',
      },
      {
        id: 'l2',
        title: { en: 'Advanced Vocabulary', ar: 'مفردات متقدمة' },
        description: { en: 'Word lists and idioms', ar: 'قوائم الكلمات' },
        unit: { en: 'Unit 2', ar: 'الوحدة 2' },
        stage: 'sec3',
        topic: 'phrasal',
        durationMin: 40,
        instructor: { en: 'Mr. Adel', ar: 'أ. عادل' },
        resources: { en: 'PDF', ar: 'ملف PDF' },
        order: 2,
        videoUrl: 'http://video2.mp4',
      },
    ];

    it('should filter by query', () => {
      const filters: LectureFilters = { query: 'grammar', stage: null, topic: null, duration: null };
      const filtered = filterLectures(mockLectures, filters, 'en');
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('l1');
    });

    it('should filter by stage', () => {
      const filters: LectureFilters = { query: '', stage: 'sec3', topic: null, duration: null };
      const filtered = filterLectures(mockLectures, filters, 'en');
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('l2');
    });

    it('should filter by topic', () => {
      const filters: LectureFilters = { query: '', stage: null, topic: 'grammar', duration: null };
      const filtered = filterLectures(mockLectures, filters, 'en');
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('l1');
    });

    it('should filter by duration', () => {
      const filters: LectureFilters = { query: '', stage: null, topic: null, duration: 'long' };
      const filtered = filterLectures(mockLectures, filters, 'en');
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('l2');
    });
  });
});
