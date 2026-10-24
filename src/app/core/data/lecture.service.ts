import { inject, Injectable } from '@angular/core';
import { catchError, from, map, Observable, of, timeout } from 'rxjs';
import { CONTINUE_WATCHING_MOCK, FEATURED_LECTURE_MOCK, LECTURES_MOCK, RECORDED_LECTURE_VIDEOS } from '../mock/lectures.mock';
import { ContinueWatchingItem, DurationBucket, FeaturedLecture, Lecture, LectureFilters } from '../models/lecture';
import { Lang } from '../models/localized';
import { SupabaseService } from '../supabase/supabase.service';

/** Recorded lectures powered by Supabase with mock fallback. */
@Injectable({ providedIn: 'root' })
export class LectureService {
  private readonly supabase = inject(SupabaseService);

  /** GET /api/lectures */
  getLectures(): Observable<Lecture[]> {
    return from(
      this.supabase
        .from('lectures')
        .select('*')
        .eq('is_published', true)
        .order('sort_order', { ascending: true })
    ).pipe(
      timeout({ each: 1200, with: () => of({ data: null, error: 'timeout' }) }),
      map(({ data, error }: any) => {
        if (error || !data || data.length === 0) {
          return LECTURES_MOCK;
        }
        return data.map((l: any, idx: number) => ({
          id: l.id,
          title: { en: l.title_en, ar: l.title_ar },
          description: { en: l.description_en, ar: l.description_ar },
          unit: { en: l.unit_en, ar: l.unit_ar },
          stage: l.stage,
          topic: l.topic,
          durationMin: l.duration_min,
          instructor: { en: 'Mr. Adel Mostafa', ar: 'أ. عادل مصطفى' },
          resources: { en: l.resources_en, ar: l.resources_ar },
          order: l.sort_order,
          thumbnailUrl: l.thumbnail_url ?? undefined,
          videoUrl: l.video_url || RECORDED_LECTURE_VIDEOS[idx % RECORDED_LECTURE_VIDEOS.length],
          access: l.access_type
            ? { type: l.access_type, priceEgp: l.price_egp ?? undefined }
            : undefined,
        }));
      }),
      catchError(() => of(LECTURES_MOCK))
    );
  }

  /** GET /api/me/continue-watching */
  getContinueWatching(): Observable<ContinueWatchingItem[]> {
    return of(CONTINUE_WATCHING_MOCK);
  }

  /** GET /api/lectures/featured */
  getFeaturedLecture(): Observable<FeaturedLecture> {
    return from(
      this.supabase
        .from('featured_lectures')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
    ).pipe(
      timeout({ each: 1200, with: () => of({ data: null, error: 'timeout' }) }),
      map(({ data, error }: any) => {
        if (error || !data) {
          return FEATURED_LECTURE_MOCK;
        }
        return {
          id: data.id,
          title: { en: data.title_en, ar: data.title_ar },
          subtitle: {
            en: 'Instructor: Mr. Adel Mostafa • Thanawya Amma final revision track',
            ar: 'المدرّس: أ. عادل مصطفى • مسار المراجعة النهائية للثانوية العامة',
          },
          lessonLabel: { en: data.lesson_label_en, ar: data.lesson_label_ar },
          captionBefore: data.caption_before,
          captionHighlight: data.caption_highlight,
          captionAfter: data.caption_after,
          note: { en: data.note_en, ar: data.note_ar },
          positionSec: data.position_sec,
          durationSec: data.duration_sec,
          videoUrl: data.video_url || RECORDED_LECTURE_VIDEOS[0],
        };
      }),
      catchError(() => of(FEATURED_LECTURE_MOCK))
    );
  }
}

export function durationBucket(minutes: number): DurationBucket {
  if (minutes < 15) return 'short';
  if (minutes <= 30) return 'medium';
  return 'long';
}

/** Client-side filtering */
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
