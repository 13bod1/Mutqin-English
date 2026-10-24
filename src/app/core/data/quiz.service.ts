import { inject, Injectable } from '@angular/core';
import { catchError, from, map, Observable, of, timeout } from 'rxjs';
import { QUIZ_MODULES_MOCK, QUIZ_QUESTIONS_MOCK } from '../mock/quizzes.mock';
import { QuizModule, QuizQuestion, QuizResult } from '../models/quiz';
import { SupabaseService } from '../supabase/supabase.service';
import { ProgressService } from './progress.service';

/** Quizzes powered by Supabase with mock fallback. */
@Injectable({ providedIn: 'root' })
export class QuizService {
  private readonly supabase = inject(SupabaseService);
  private readonly progress = inject(ProgressService);

  /** GET /api/quizzes */
  getModules(): Observable<QuizModule[]> {
    return from(
      this.supabase
        .from('quiz_modules')
        .select('*')
        .eq('is_published', true)
        .order('sort_order', { ascending: true })
    ).pipe(
      timeout({ each: 1200, with: () => of({ data: null, error: 'timeout' }) }),
      map(({ data, error }: any) => {
        if (error || !data || data.length === 0) {
          return QUIZ_MODULES_MOCK;
        }
        return data.map((m: any): QuizModule => ({
          id: m.id,
          title: { en: m.title_en, ar: m.title_ar },
          description: { en: m.description_en, ar: m.description_ar },
          categories: m.categories,
          difficulty: m.difficulty,
          durationMin: m.duration_min,
          questionCount: m.question_count,
          recommended: m.recommended,
        }));
      }),
      catchError(() => of(QUIZ_MODULES_MOCK))
    );
  }

  /** GET /api/quizzes/:id/questions */
  getQuestions(moduleId: string): Observable<QuizQuestion[]> {
    return from(
      this.supabase
        .from('quiz_questions')
        .select('*')
        .eq('module_id', moduleId)
        .order('sort_order', { ascending: true })
    ).pipe(
      timeout({ each: 1200, with: () => of({ data: null, error: 'timeout' }) }),
      map(({ data, error }: any) => {
        if (error || !data || data.length === 0) {
          return QUIZ_QUESTIONS_MOCK[moduleId] ?? [];
        }
        return data.map((q: any): QuizQuestion => ({
          id: q.id,
          topic: { en: q.topic_en, ar: q.topic_ar },
          before: q.sentence_before,
          after: q.sentence_after,
          options: q.options,
          correctIndex: q.correct_index,
          ruleTitle: { en: q.rule_title_en, ar: q.rule_title_ar },
          explanation: { en: q.explanation_en, ar: q.explanation_ar },
          arabicTip:
            q.arabic_tip_en || q.arabic_tip_ar
              ? { en: q.arabic_tip_en || '', ar: q.arabic_tip_ar || '' }
              : undefined,
        }));
      }),
      catchError(() => of(QUIZ_QUESTIONS_MOCK[moduleId] ?? []))
    );
  }

  /** Grade quiz attempt and save results to Supabase + award XP */
  grade(module: QuizModule, questions: QuizQuestion[], answers: (number | null)[], elapsedSec: number): QuizResult {
    const review = questions.map((question, index) => ({
      question,
      index,
      selectedIndex: answers[index] ?? null,
      correct: answers[index] === question.correctIndex,
    }));
    const correct = review.filter((r) => r.correct).length;
    const percent = questions.length ? Math.round((correct / questions.length) * 100) : 0;

    // Record result and award XP (async, non-blocking)
    // Calculate XP locally for immediate display:
    // 25 XP per correct answer + accuracy bonuses + completion bonus
    let xpEarned = correct * 25;
    if (percent === 100) xpEarned += 75;       // Perfect score bonus
    else if (percent >= 85) xpEarned += 50;    // High accuracy bonus
    else if (percent >= 70) xpEarned += 25;    // Passing bonus
    if (correct > 0) xpEarned += 25;           // Completion bonus

    this.progress.recordQuizResult(module.id, correct, questions.length, percent, xpEarned)
      .then(xp => {
        if (xp > 0) {
          console.log(`🏆 Earned ${xp} XP from quiz "${module.id}" — your rank is updating!`);
        }
      })
      .catch(() => {});

    return {
      moduleTitle: module.title,
      correct,
      total: questions.length,
      percent,
      elapsedSec,
      xpEarned,
      review,
    };
  }
}
