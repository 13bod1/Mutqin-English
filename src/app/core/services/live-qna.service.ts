import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { LiveQuestion, LiveQuestionStatus } from '../models/sprint3';

export const QNA_HOUSE_RULES = {
  en: [
    'Questions must be directly related to the current lecture or topic.',
    'Be polite and concise so Mr. Adel and the assistants can respond effectively.',
    'Rate limit: 1 question every 15 seconds.',
    'Questions pass through moderation before becoming visible to all students.',
    'Spam, disruptive messages, or sharing personal contacts will lead to suspension.',
  ],
  ar: [
    'يجب أن تكون الأسئلة متعلقة مباشرة بموضوع الحصة أو المحاضرة الحالية.',
    'يرجى صياغة السؤال بإيجاز ووضوح لتسهيل الإجابة من قِبل الأستاذ عادل ومساعديه.',
    'الحد الزمني: سؤال واحد كل 15 ثانية كحد أقصى.',
    'تخضع الأسئلة للمراجعة قبل أن تظهر لجميع الطلاب.',
    'يُمنع التكرار أو إرسال أرقام هواتف أو روابط غير مصرح بها.',
  ],
};

export const SAMPLE_QUESTIONS: { body: string; topic: string }[] = [
  { body: 'Can you explain the difference between "used to" and "would" for past habits?', topic: 'Grammar' },
  { body: 'How do we identify the tone of the writer in unseen reading passages?', topic: 'Exam Skills' },
  { body: 'When does the past perfect continuous take precedence over the simple past perfect?', topic: 'Grammar' },
];

@Injectable({
  providedIn: 'root',
})
export class LiveQnaService {
  private readonly questionsSubject = new BehaviorSubject<LiveQuestion[]>([]);
  readonly questions$ = this.questionsSubject.asObservable();

  // Track submission timestamps per student for the 15-second rate limit
  private readonly lastSubmissionTime = new Map<string, number>();

  constructor() {
    this.seedInitialQuestions();
  }

  private seedInitialQuestions(): void {
    const initial: LiveQuestion[] = [
      {
        id: 'q1',
        liveSessionId: 'live_grammar_1',
        studentId: 'u1',
        studentName: 'Nour Saeed',
        body: 'Is the inversion rule after "Neither/Nor" tested in the Thanawya Amma exam format?',
        status: 'approved',
        createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        answeredAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      },
      {
        id: 'q2',
        liveSessionId: 'live_grammar_1',
        studentId: 'u2',
        studentName: 'Youssef Hany',
        body: 'Could you re-explain the exception with stative verbs in progressive aspects?',
        status: 'approved',
        createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
      },
      {
        id: 'q3',
        liveSessionId: 'live_grammar_1',
        studentId: 'u3',
        studentName: 'Mariam Ali',
        body: 'Will these PDF summary slides be available for download right after this broadcast ends?',
        status: 'pending',
        createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
      },
    ];
    this.questionsSubject.next(initial);
  }

  /**
   * Sanitizes input text against HTML and script injections.
   */
  sanitizeText(text: string): string {
    if (!text) return '';
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/onerror\s*=/gi, '')
      .replace(/onload\s*=/gi, '')
      .trim();
  }

  /**
   * Submits a student live question with 15-second rate limit and XSS sanitation.
   */
  submitQuestion(
    liveSessionId: string,
    studentId: string,
    studentName: string,
    rawBody: string
  ): { success: boolean; error?: string; question?: LiveQuestion; secondsRemaining?: number } {
    const cleanBody = this.sanitizeText(rawBody);
    if (!cleanBody || cleanBody.length < 5) {
      return { success: false, error: 'Question must be at least 5 characters long.' };
    }

    // 15-second rate limit per student
    const now = Date.now();
    const lastTime = this.lastSubmissionTime.get(studentId) || 0;
    const diffSeconds = (now - lastTime) / 1000;
    if (diffSeconds < 15) {
      const remaining = Math.ceil(15 - diffSeconds);
      return {
        success: false,
        secondsRemaining: remaining,
        error: `Please wait ${remaining} seconds before submitting another question.`,
      };
    }

    const question: LiveQuestion = {
      id: 'q_' + Math.random().toString(36).substring(2, 9),
      liveSessionId,
      studentId,
      studentName,
      body: cleanBody,
      status: 'pending', // Starts pending moderation
      createdAt: new Date().toISOString(),
    };

    this.lastSubmissionTime.set(studentId, now);

    const updated = [question, ...this.questionsSubject.getValue()];
    this.questionsSubject.next(updated);

    return { success: true, question };
  }

  /**
   * Returns live questions for students:
   * Only approved questions are visible, PLUS any question the student themselves asked (even if pending).
   */
  getStudentQuestions(liveSessionId: string, currentStudentId: string): Observable<LiveQuestion[]> {
    return this.questionsSubject.pipe(
      map((list) =>
        list.filter(
          (q) =>
            q.liveSessionId === liveSessionId &&
            (q.status === 'approved' || q.status === 'answered' || q.studentId === currentStudentId)
        )
      )
    );
  }

  /**
   * Returns all questions for teacher/assistant moderation queue.
   */
  getModerationQuestions(liveSessionId: string): Observable<LiveQuestion[]> {
    return this.questionsSubject.pipe(
      map((list) => list.filter((q) => q.liveSessionId === liveSessionId))
    );
  }

  /**
   * Moderates a question: approve, hide, or mark as answered.
   */
  updateQuestionStatus(
    questionId: string,
    status: LiveQuestionStatus,
    moderatedBy = 'Assistant'
  ): boolean {
    const current = this.questionsSubject.getValue();
    const target = current.find((q) => q.id === questionId);
    if (!target) return false;

    target.status = status;
    target.moderatedBy = moderatedBy;
    if (status === 'answered') {
      target.answeredAt = new Date().toISOString();
    }

    this.questionsSubject.next([...current]);
    return true;
  }
}
