import { inject, Injectable } from '@angular/core';
import { from, map, Observable, of, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { INSTRUCTOR_MOCK, PLATFORM_STATS_MOCK, TESTIMONIALS_MOCK } from '../mock/content.mock';
import { Instructor, PlatformStats, SiteVideo, Testimonial } from '../models/content';
import { SupabaseService } from '../supabase/supabase.service';

/** Public marketing and platform content powered by Supabase with resilient fallbacks. */
@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly supabase = inject(SupabaseService);

  /** GET /api/platform/stats */
  getPlatformStats(): Observable<PlatformStats> {
    return from(
      this.supabase
        .from('platform_stats')
        .select('rating, students_count')
        .limit(1)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error || !data) {
          return PLATFORM_STATS_MOCK;
        }
        if (!Number.isFinite(Number(data.rating)) || !Number.isFinite(Number(data.students_count)) || Number(data.rating) < 0 || Number(data.rating) > 5 || Number(data.students_count) < 0) {
          return PLATFORM_STATS_MOCK;
        }
        return {
          rating: Number(data.rating),
          studentsCount: Number(data.students_count),
        };
      }),
      catchError(() => of(PLATFORM_STATS_MOCK))
    );
  }

  /** GET /api/instructors/featured */
  getFeaturedInstructor(): Observable<Instructor> {
    return from(
      this.supabase
        .from('instructors')
        .select(`
          name_en, name_ar,
          title_en, title_ar,
          credential_en, credential_ar,
          bio_en, bio_ar,
          quote_en, quote_ar,
          quote_author_en, quote_author_ar,
          photo_url,
          instructor_stats ( value, label_en, label_ar, sort_order )
        `)
        .eq('is_featured', true)
        .limit(1)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error || !data || !data.name_en?.includes('Adel Mostafa')) {
          return INSTRUCTOR_MOCK;
        }
        const stats = (data.instructor_stats || [])
          .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((s: any) => ({
            value: s.value,
            label: { en: s.label_en, ar: s.label_ar },
          }));

        return {
          name: { en: data.name_en, ar: data.name_ar },
          title: { en: data.title_en, ar: data.title_ar },
          credential: { en: data.credential_en, ar: data.credential_ar },
          bio: { en: data.bio_en, ar: data.bio_ar },
          quote: { en: data.quote_en, ar: data.quote_ar },
          quoteAuthor: { en: data.quote_author_en, ar: data.quote_author_ar },
          photoUrl: data.photo_url || INSTRUCTOR_MOCK.photoUrl,
          stats: stats.length ? stats : INSTRUCTOR_MOCK.stats,
        };
      }),
      catchError(() => of(INSTRUCTOR_MOCK))
    );
  }

  /** GET /api/testimonials */
  getTestimonials(): Observable<Testimonial[]> {
    return from(
      this.supabase
        .from('testimonials')
        .select('*')
        .order('sort_order', { ascending: true })
    ).pipe(
      map(({ data, error }) => {
        if (error || !data || data.length === 0) {
          return TESTIMONIALS_MOCK;
        }
        return data.map((t: any) => ({
          id: t.id,
          name: { en: t.name_en, ar: t.name_ar },
          location: { en: t.location_en, ar: t.location_ar },
          quote: { en: t.quote_en, ar: t.quote_ar },
          rating: t.rating,
          avatarUrl: t.avatar_url,
        }));
      }),
      catchError(() => of(TESTIMONIALS_MOCK))
    );
  }

  /** GET introductory video from Supabase site_videos or fallback to configured storage URL */
  getIntroductoryVideo(): Observable<SiteVideo> {
    const fallback: SiteVideo = {
      slug: 'intro',
      videoUrl: environment.introVideo.url,
      posterUrl: 'images/intro-thumbnail.jpg',
      title: environment.introVideo.title,
      isActive: true,
    };

    return from(
      this.supabase
        .from('site_videos')
        .select('*')
        .eq('slug', 'intro')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
    ).pipe(
      map(({ data, error }) => {
        if (error || !data || !data.video_url) {
          return fallback;
        }
        return {
          id: data.id,
          slug: data.slug,
          videoUrl: data.video_url,
          posterUrl: data.poster_url,
          title: {
            en: data.title_en || fallback.title.en,
            ar: data.title_ar || fallback.title.ar,
          },
          isActive: data.is_active,
        };
      }),
      catchError(() => of(fallback))
    );
  }
}
