import { inject, Injectable } from '@angular/core';
import { catchError, from, map, Observable, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CONTINUE_WATCHING_MOCK, FEATURED_LECTURE_MOCK, LECTURES_MOCK, RECORDED_LECTURE_VIDEOS } from '../mock/lectures.mock';
import { ContinueWatchingItem, DurationBucket, FeaturedLecture, Lecture, LectureFilters } from '../models/lecture';
import { Lang } from '../models/localized';
import { SupabaseService } from '../supabase/supabase.service';

/** Detect PostgREST / Supabase auth and permission errors */
function loadLocalAdminLectures(): Lecture[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('mutqin_admin_lectures');
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list) && list.length > 0) {
          return list.map((l: any, idx: number) => ({
            id: l.id,
            title: l.title,
            description: l.description || { en: 'Comprehensive lesson', ar: 'درس تفصيلي' },
            unit: l.unit || { en: 'Unit 1', ar: 'الوحدة 1' },
            stage: l.stage || 'sec3',
            topic: l.topic || 'grammar',
            durationMin: l.durationMin || 45,
            instructor: { en: 'Mr. Adel Mostafa', ar: 'أ. عادل مصطفى' },
            resources: l.resources || { en: 'Summary PDF & Notes', ar: 'ملخص وقواعد PDF' },
            order: l.order || idx + 1,
            thumbnailUrl: l.thumbnailUrl,
            videoUrl: l.videoUrl || RECORDED_LECTURE_VIDEOS[idx % RECORDED_LECTURE_VIDEOS.length],
            access: l.access,
          }));
        }
      }
    }
  } catch {}
  return LECTURES_MOCK;
}

export function isAuthOrPermissionError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || error.status || '');
  const msg = String(error.message || error.error_description || error || '').toLowerCase();
  return (
    code === '42501' ||
    code === '401' ||
    code === '403' ||
    code === 'PGRST301' ||
    msg.includes('permission denied') ||
    msg.includes('row-level security') ||
    msg.includes('jwt') ||
    msg.includes('unauthorized') ||
    msg.includes('forbidden') ||
    msg.includes('not authorized')
  );
}

/** Recorded lectures powered by Supabase with fail-closed access control. */
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
      map(({ data, error }: any) => {
        if (error) {
          if (isAuthOrPermissionError(error)) {
            throw new Error(`Access denied: insufficient permissions (${error.message || error.code || 'RLS'})`);
          }
          if (environment.production) {
            throw new Error(`Failed to load lectures: ${error.message || 'Database error'}`);
          }
          return loadLocalAdminLectures();
        }

        if (!data || data.length === 0) {
          return environment.production ? [] : LECTURES_MOCK;
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
      catchError((err) => {
        if (isAuthOrPermissionError(err) || environment.production) {
          return throwError(() => err);
        }
        return of(loadLocalAdminLectures());
      })
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
      map(({ data, error }: any) => {
        if (error) {
          if (isAuthOrPermissionError(error)) {
            throw new Error(`Access denied: insufficient permissions (${error.message || error.code || 'RLS'})`);
          }
          if (environment.production) {
            throw new Error(`Failed to load featured lecture: ${error.message || 'Database error'}`);
          }
          return FEATURED_LECTURE_MOCK;
        }

        if (!data) {
          if (environment.production) {
            throw new Error('Featured lecture not found');
          }
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
      catchError((err) => {
        if (isAuthOrPermissionError(err) || environment.production) {
          return throwError(() => err);
        }
        return of(FEATURED_LECTURE_MOCK);
      })
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
