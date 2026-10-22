import { Access } from './commerce';
import { LocalizedText } from './localized';

export type AcademicStage = 'prep' | 'sec1' | 'sec2' | 'sec3' | 'university';
export type LectureTopic = 'grammar' | 'phrasal' | 'phonetics' | 'exam';
export type DurationBucket = 'short' | 'medium' | 'long';

export interface Lecture {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  unit: LocalizedText;
  stage: AcademicStage;
  topic: LectureTopic;
  durationMin: number;
  instructor: LocalizedText;
  resources: LocalizedText;
  /** Curriculum position, used by the "Curriculum order" sort. */
  order: number;
  thumbnailUrl?: string;
  videoUrl?: string;
  /** Free, included for registered students (default) or paid individually. */
  access?: Access;
}

/** A lecture the signed-in student has started (GET /api/me/continue-watching). */
export interface ContinueWatchingItem {
  lecture: Lecture;
  percent: number;
  minutesLeft: number;
}

/** Lecture shown in the interactive player preview (GET /api/lectures/featured). */
export interface FeaturedLecture {
  title: LocalizedText;
  subtitle: LocalizedText;
  lessonLabel: LocalizedText;
  captionBefore: string;
  captionHighlight: string;
  captionAfter: string;
  note: LocalizedText;
  positionSec: number;
  durationSec: number;
  videoUrl?: string;
}

export interface LectureFilters {
  query: string;
  stage: AcademicStage | null;
  topic: LectureTopic | null;
  duration: DurationBucket | null;
}
