import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { QUIZ_MODULES_MOCK, QUIZ_QUESTIONS_MOCK } from '../mock/quizzes.mock';
import { QuizModule, QuizQuestion, QuizResult } from '../models/quiz';
import { mockResponse } from './mock-response';

/** Quizzes. TODO(backend): replace mocks with HttpClient calls; grading should move server-side. */
@Injectable({ providedIn: 'root' })
export class QuizService {
  /** GET /api/quizzes */
  getModules(): Observable<QuizModule[]> {
    return mockResponse(QUIZ_MODULES_MOCK);
  }

  /** GET /api/quizzes/:id/questions */
  getQuestions(moduleId: string): Observable<QuizQuestion[]> {
    return mockResponse(QUIZ_QUESTIONS_MOCK[moduleId] ?? []);
  }

  /** POST /api/quizzes/:id/attempts — graded locally for now. */
  grade(module: QuizModule, questions: QuizQuestion[], answers: (number | null)[], elapsedSec: number): QuizResult {
    const review = questions.map((question, index) => ({
      question,
      index,
      selectedIndex: answers[index] ?? null,
      correct: answers[index] === question.correctIndex,
    }));
    const correct = review.filter((r) => r.correct).length;
    return {
      moduleTitle: module.title,
      correct,
      total: questions.length,
      percent: questions.length ? Math.round((correct / questions.length) * 100) : 0,
      elapsedSec,
      review,
    };
  }
}
