import { LocalizedText } from './localized';

/** Marketing figures shown on the landing page (GET /api/platform/stats). */
export interface PlatformStats {
  rating: number;
  studentsCount: number;
}

export interface InstructorStat {
  value: string;
  label: LocalizedText;
}

/** Featured instructor (GET /api/instructors/featured). */
export interface Instructor {
  name: LocalizedText;
  title: LocalizedText;
  credential: LocalizedText;
  bio: LocalizedText;
  quote: LocalizedText;
  quoteAuthor: LocalizedText;
  photoUrl?: string;
  stats: InstructorStat[];
}

/** Student review (GET /api/testimonials). */
export interface Testimonial {
  id: string;
  name: LocalizedText;
  location: LocalizedText;
  quote: LocalizedText;
  rating: number;
  avatarUrl?: string;
}

export interface SiteVideo {
  id?: string;
  slug: string;
  videoUrl: string;
  posterUrl?: string;
  title: LocalizedText;
  isActive?: boolean;
}
