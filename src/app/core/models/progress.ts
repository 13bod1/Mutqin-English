import { LocalizedText } from './localized';

export type WeekDay = 'sat' | 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri';
export type SkillKey = 'grammar' | 'vocabulary' | 'speaking';
export type SkillLevel = 'excellent' | 'proficient' | 'good' | 'developing';

export interface StudentProfile {
  fullName: LocalizedText;
  initials: string;
  stage: LocalizedText;
  goal: LocalizedText;
  city: LocalizedText;
  avatarUrl?: string;
}

/** Dashboard numbers for the signed-in student (GET /api/me/progress). */
export interface ProgressSummary {
  cefrLevel: string;
  cefrLabel: LocalizedText;
  weeklyGoalHours: { done: number; target: number };
  vocabularyWords: number;
  quizAccuracy: number;
  syllabus: { completed: number; total: number };
  studyHours: number;
  studyHoursDelta: number;
  streakDays: number;
  bestStreakDays: number;
  quizzesCompleted: number;
  weeklyActivity: { day: WeekDay; minutes: number }[];
  weeklyFocus: LocalizedText;
  skills: { key: SkillKey; percent: number; level: SkillLevel }[];
  recommendation: LocalizedText;
}

export interface LeaderboardEntry {
  rank: number;
  name: LocalizedText;
  city: LocalizedText;
  xp: number;
  isCurrentUser?: boolean;
}

export type BadgeIcon = 'trophy' | 'flame' | 'headphones' | 'medal';

export interface Achievement {
  id: string;
  icon: BadgeIcon;
  title: LocalizedText;
  description: LocalizedText;
}
