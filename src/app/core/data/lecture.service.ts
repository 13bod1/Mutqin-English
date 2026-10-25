import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, from, map, Observable, of } from 'rxjs';
import { CONTINUE_WATCHING_MOCK, FEATURED_LECTURE_MOCK, LECTURES_MOCK, RECORDED_LECTURE_VIDEOS } from '../mock/lectures.mock';
import { ContinueWatchingItem, DurationBucket, FeaturedLecture, Lecture, LectureFilters } from '../models/lecture';
import { Lang } from '../models/localized';
import { SupabaseService } from '../supabase/supabase.service';

export function loadCombinedLectures(): Lecture[] {
  const map = new Map<string, Lecture>();

  // 1. Base mock lectures
  for (const m of LECTURES_MOCK) {
    map.set(m.id, m);
  }

  // 2. Add / override with admin lectures
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem('mutqin_admin_lectures');
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          for (let i = 0; i < list.length; i++) {
            const l = list[i];
            // Only published lectures are visible to students
            if (l.state === 'draft' || l.state === 'scheduled') continue;

            const existing = map.get(l.id);
            const titleEn = typeof l.title === 'object' ? l.title?.en : l.title;
            const titleAr = typeof l.title === 'object' ? l.title?.ar : (l.title_ar || titleEn);

            const item: Lecture = {
              id: l.id,
              title: { en: titleEn || 'Lecture', ar: titleAr || titleEn || 'محاضرة' },
              description: l.description || existing?.description || { en: 'Comprehensive lesson by Mr. Adel Mostafa', ar: 'درس تفصيلي وشرح متكامل للأستاذ عادل مصطفى' },
              unit: l.unit || existing?.unit || { en: 'Unit ' + (i + 1), ar: 'الوحدة ' + (i + 1) },
              stage: l.stage || existing?.stage || 'sec3',
              topic: l.topic || existing?.topic || 'grammar',
              durationMin: l.durationMin || existing?.durationMin || 45,
              instructor: { en: 'Mr. Adel Mostafa', ar: 'أ. عادل مصطفى' },
              resources: l.resources || existing?.resources || { en: 'Summary PDF & Notes', ar: 'ملخص وقواعد PDF' },
              order: l.order || existing?.order || i + 1,
              thumbnailUrl: l.thumbnailUrl || existing?.thumbnailUrl || ((l.topic || existing?.topic) === 'phonetics' ? '/images/thumb-phonetics.svg' : (l.topic || existing?.topic) === 'exam' ? '/images/thumb-exam.svg' : (l.topic || existing?.topic) === 'phrasal' ? '/images/thumb-phrasal.svg' : '/images/thumb-grammar.svg'),
              videoUrl: l.videoUrl || existing?.videoUrl || RECORDED_LECTURE_VIDEOS[i % RECORDED_LECTURE_VIDEOS.length],
              access: l.access || existing?.access || { type: 'included' },
            };
            map.set(l.id, item);
          }
        }
      }
    } catch {}
  }

  return Array.from(map.values());
}

/** Recorded lectures powered by Supabase with live admin synchronization. */
@Injectable({ providedIn: 'root' })
export class LectureService {
  private readonly supabase = inject(SupabaseService);
  private readonly lecturesSubject = new BehaviorSubject<Lecture[]>(loadCombinedLectures());

  constructor() {
    if (typeof window !== 'undefined') {
      const refresh = () => this.lecturesSubject.next(loadCombinedLectures());
      window.addEventListener('mutqin_lectures_updated', refresh);
    }
  }

  private async syncSupabase(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('lectures')
        .select('*')
        .eq('is_published', true)
        .order('sort_order', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        const combined = loadCombinedLectures();
        const map = new Map<string, Lecture>(combined.map((l) => [l.id, l]));

        data.forEach((l: any, idx: number) => {
          map.set(l.id, {
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
            access: l.access_type ? { type: l.access_type, priceEgp: l.price_egp ?? undefined } : undefined,
          });
        });

        this.lecturesSubject.next(Array.from(map.values()));
      }
    } catch {}
  }

  /** GET /api/lectures — Live reactive stream synchronized with Admin dashboard */
  getLectures(): Observable<Lecture[]> {
    return this.lecturesSubject.asObservable();
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
      map(({ data, error }) => {
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
