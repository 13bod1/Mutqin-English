import { LocalizedText } from './localized';

export type QuizCategory = 'grammar' | 'vocabulary' | 'phonetics' | 'exam';
export type Difficulty = 'easy' | 'medium' | 'advanced';

/** Practice module card (GET /api/quizzes). */
export interface QuizModule {
  id: string;
  categories: QuizCategory[];
  difficulty: Difficulty;
  title: LocalizedText;
  description: LocalizedText;
  durationMin: number;
  questionCount: number;
  recommended?: boolean;
}

/** One multiple-choice item (GET /api/quizzes/:id/questions). Sentences stay in English. */
export interface QuizQuestion {
  id: string;
  topic: LocalizedText;
  /** Sentence split around the blank: before ______ after. */
  before: string;
  after: string;
  options: string[];
  correctIndex: number;
  ruleTitle: LocalizedText;
  explanation: LocalizedText;
  /** Tip about typical Arabic-speaker interference, when relevant. */
  arabicTip?: LocalizedText;
}

export interface QuizAnswerReview {
  question: QuizQuestion;
  index: number;
  selectedIndex: number | null;
  correct: boolean;
}

export interface QuizResult {
  moduleTitle: LocalizedText;
  correct: number;
  total: number;
  percent: number;
  elapsedSec: number;
  review: QuizAnswerReview[];
}
