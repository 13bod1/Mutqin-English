import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, from, map, Observable, of, switchMap } from 'rxjs';
import { Achievement, LeaderboardEntry, ProgressSummary, StudentProfile, WeekDay } from '../models/progress';
import { AuthService } from './auth.service';
import { SupabaseService } from '../supabase/supabase.service';

function getStageLabel(stage: string | undefined, lang: 'en' | 'ar'): string {
  const map: Record<string, { en: string; ar: string }> = {
    prep: { en: 'Preparatory School · Grade 3', ar: 'المرحلة الإعدادية · الصف الثالث' },
    sec1: { en: 'Secondary Grade 1 · Thanawya Track', ar: 'الصف الأول الثانوي · مسار الثانوية' },
    sec2: { en: 'Secondary Grade 2 · Advanced Track', ar: 'الصف الثاني الثانوي · المسار المتقدم' },
    sec3: { en: 'Secondary Grade 3 · Thanawya Amma Final Track', ar: 'الصف الثالث الثانوي · مسار الثانوية العامة' },
    university: { en: 'University & General Fluency', ar: 'المرحلة الجامعية والطلاقة العامة' },
  };
  return map[stage || 'sec3']?.[lang] || (lang === 'en' ? 'Secondary Grade 3' : 'الصف الثالث الثانوي');
}

/** National Cohort of Top Egyptian Students (baseline for weekly ranking) */
export const EGYPTIAN_STUDENTS_COHORT: { name: { en: string; ar: string }; city: { en: string; ar: string }; xp: number }[] = [
  { name: { en: 'Mariam Tarek', ar: 'مريم طارق' }, city: { en: 'Cairo', ar: 'القاهرة' }, xp: 3890 },
  { name: { en: 'Omar Sherif', ar: 'عمر شريف' }, city: { en: 'Alexandria', ar: 'الإسكندرية' }, xp: 3420 },
  { name: { en: 'Nour El-Hoda', ar: 'نور الهدى' }, city: { en: 'Mansoura', ar: 'المنصورة' }, xp: 3110 },
  { name: { en: 'Youssef Ibrahim', ar: 'يوسف إبراهيم' }, city: { en: 'Giza', ar: 'الجيزة' }, xp: 2780 },
  { name: { en: 'Salma Mahmoud', ar: 'سلمى محمود' }, city: { en: 'Tanta', ar: 'طنطا' }, xp: 2150 },
  { name: { en: 'Ziad Mostafa', ar: 'زياد مصطفى' }, city: { en: 'Assiut', ar: 'أسيوط' }, xp: 1820 },
  { name: { en: 'Farida Amr', ar: 'فريدة عمرو' }, city: { en: 'Ismailia', ar: 'الإسماعيلية' }, xp: 1490 },
  { name: { en: 'Karim Nabil', ar: 'كريم نبيل' }, city: { en: 'Port Said', ar: 'بورسعيد' }, xp: 1100 },
  { name: { en: 'Hoda Khaled', ar: 'هدى خالد' }, city: { en: 'Suez', ar: 'السويس' }, xp: 750 },
  { name: { en: 'Mostafa Adel', ar: 'مصطفى عادل' }, city: { en: 'Zagazig', ar: 'الزقازيق' }, xp: 400 },
];

interface LocalStoredProgress {
  xp: number;
  quizzesCompleted: number;
  totalCorrect: number;
  totalAnswered: number;
  grammarAccuracy: number;
  vocabAccuracy: number;
  streakDays: number;
  bestStreakDays: number;
  studyHours: number;
  lastActiveDate: string;
  weeklyActivity: { day: WeekDay; minutes: number }[];
  completedQuizzes: Record<string, { correct: number; total: number; percent: number; xpEarned: number }>;
}

const DEFAULT_WEEKLY_ACTIVITY: { day: WeekDay; minutes: number }[] = [
  { day: 'sat', minutes: 0 },
  { day: 'sun', minutes: 0 },
  { day: 'mon', minutes: 0 },
  { day: 'tue', minutes: 0 },
  { day: 'wed', minutes: 0 },
  { day: 'thu', minutes: 0 },
  { day: 'fri', minutes: 0 },
];

@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseService);

  /** Reactive subject triggered whenever quizzes are solved and XP changes */
  private readonly progressChange$ = new BehaviorSubject<number>(Date.now());

  private getStorageKey(userId?: string): string {
    return `mutqin_progress_${userId || 'guest'}`;
  }

  private loadLocalProgress(userId?: string): LocalStoredProgress {
    if (typeof localStorage === 'undefined') {
      return this.createBlankProgress();
    }
    try {
      const raw = localStorage.getItem(this.getStorageKey(userId));
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {}
    return this.createBlankProgress();
  }

  private saveLocalProgress(data: LocalStoredProgress, userId?: string): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.getStorageKey(userId), JSON.stringify(data));
    } catch {}
  }

  private createBlankProgress(): LocalStoredProgress {
    return {
      xp: 0,
      quizzesCompleted: 0,
      totalCorrect: 0,
      totalAnswered: 0,
      grammarAccuracy: 0,
      vocabAccuracy: 0,
      streakDays: 0,
      bestStreakDays: 0,
      studyHours: 0,
      lastActiveDate: '',
      weeklyActivity: DEFAULT_WEEKLY_ACTIVITY.map(d => ({ ...d })),
      completedQuizzes: {},
    };
  }

  /** GET /api/me/profile - Dynamic profile reflecting real user credentials */
  getProfile(): Observable<StudentProfile> {
    const user = this.auth.user();
    const fallbackName = user?.fullName || 'Student';
    const fallbackInitials = user?.initials || 'ST';

    if (user?.id && !user.id.startsWith('usr_')) {
      return from(
        this.supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()
      ).pipe(
        map(({ data, error }) => {
          if (error || !data) {
            return this.buildLocalProfile(fallbackName, fallbackInitials, user?.stage);
          }
          const enName = data.full_name_en || fallbackName;
          const arName = data.full_name_ar || fallbackName;
          return {
            fullName: { en: enName, ar: arName },
            initials: data.initials || fallbackInitials,
            stage: {
              en: data.stage_en ? getStageLabel(data.stage_en, 'en') : getStageLabel(user?.stage, 'en'),
              ar: data.stage_ar ? getStageLabel(data.stage_ar, 'ar') : getStageLabel(user?.stage, 'ar'),
            },
            goal: {
              en: data.goal_en || 'Target: Thanawya Amma 100% & IELTS Band 7.5',
              ar: data.goal_ar || 'الهدف: الدرجة النهائية بالثانوية والآيلتس 7.5',
            },
            city: {
              en: data.city_en || 'Cairo',
              ar: data.city_ar || 'القاهرة',
            },
            avatarUrl: data.avatar_url,
          };
        }),
        catchError(() => of(this.buildLocalProfile(fallbackName, fallbackInitials, user?.stage)))
      );
    }

    return of(this.buildLocalProfile(fallbackName, fallbackInitials, user?.stage));
  }

  private buildLocalProfile(name: string, initials: string, stage?: string): StudentProfile {
    return {
      fullName: { en: name, ar: name },
      initials,
      stage: {
        en: getStageLabel(stage, 'en'),
        ar: getStageLabel(stage, 'ar'),
      },
      goal: {
        en: 'Target: Thanawya Amma English 100% & IELTS Band 7.5',
        ar: 'الهدف: الدرجة النهائية في الإنجليزية بالثانوية واختبار IELTS',
      },
      city: { en: 'Cairo', ar: 'القاهرة' },
    };
  }

  /** GET /api/me/progress - Real progress starting from zero and increasing with quiz score */
  getSummary(): Observable<ProgressSummary> {
    return this.progressChange$.pipe(
      switchMap(() => {
        const user = this.auth.user();
        const studentName = user?.fullName || 'Student';
        const local = this.loadLocalProgress(user?.id);

        if (user?.id && !user.id.startsWith('usr_')) {
          return from(
            this.supabase
              .from('user_progress')
              .select('*')
              .eq('user_id', user.id)
              .maybeSingle()
          ).pipe(
            map(({ data, error }) => {
              if (!error && data) {
                // If Supabase has data, use the max XP between local and remote
                const mergedXp = Math.max(local.xp, data.xp || 0);
                const mergedQuizzes = Math.max(local.quizzesCompleted, data.quizzes_completed || 0);
                const mergedCorrect = Math.max(local.totalCorrect, data.total_correct || 0);
                const mergedAnswered = Math.max(local.totalAnswered, data.total_answered || 0);
                const mergedStudyHours = Math.max(local.studyHours, data.study_hours || 0);
                const mergedStreak = Math.max(local.streakDays, data.streak_days || 0);
                const mergedBestStreak = Math.max(local.bestStreakDays, data.best_streak_days || 0);

                return this.buildSummaryObject({
                  xp: mergedXp,
                  quizzesCompleted: mergedQuizzes,
                  totalCorrect: mergedCorrect,
                  totalAnswered: mergedAnswered,
                  studyHours: mergedStudyHours,
                  streakDays: mergedStreak,
                  bestStreakDays: mergedBestStreak,
                  weeklyActivity: local.weeklyActivity,
                  studentName,
                });
              }
              return this.buildSummaryObject({
                ...local,
                studentName,
              });
            }),
            catchError(() => of(this.buildSummaryObject({ ...local, studentName })))
          );
        }

        return of(this.buildSummaryObject({ ...local, studentName }));
      })
    );
  }

  private buildSummaryObject(data: {
    xp: number;
    quizzesCompleted: number;
    totalCorrect: number;
    totalAnswered: number;
    studyHours: number;
    streakDays: number;
    bestStreakDays: number;
    weeklyActivity: { day: WeekDay; minutes: number }[];
    studentName: string;
  }): ProgressSummary {
    const accuracy = data.totalAnswered > 0 ? Math.round((data.totalCorrect / data.totalAnswered) * 1000) / 10 : 0;
    const xp = data.xp;
    const quizzesCompleted = data.quizzesCompleted;
    const studyHours = data.studyHours;

    // CEFR Level based on XP
    let cefrLevel = 'A1';
    let cefrLabel = { en: 'A1 Beginner', ar: 'A1 مبتدئ' };
    if (xp >= 4000) { cefrLevel = 'C1'; cefrLabel = { en: 'C1 Advanced', ar: 'C1 متقدم' }; }
    else if (xp >= 2500) { cefrLevel = 'B2'; cefrLabel = { en: 'B2 Upper-Intermediate', ar: 'B2 فوق المتوسط' }; }
    else if (xp >= 1200) { cefrLevel = 'B1'; cefrLabel = { en: 'B1 Intermediate', ar: 'B1 متوسط' }; }
    else if (xp >= 400) { cefrLevel = 'A2'; cefrLabel = { en: 'A2 Elementary', ar: 'A2 مبتدئ متقدم' }; }

    const skillLevel = (pct: number) => {
      if (pct >= 90) return 'excellent' as const;
      if (pct >= 80) return 'proficient' as const;
      if (pct >= 65) return 'good' as const;
      return 'developing' as const;
    };

    const grammarPct = quizzesCompleted > 0 ? Math.round(accuracy) : 0;
    const vocabPct = quizzesCompleted > 0 ? Math.min(100, Math.round(accuracy * 0.95)) : 0;
    const speakingPct = quizzesCompleted > 0 ? Math.min(100, Math.round(Math.min(accuracy * 0.85, 30 + studyHours * 10))) : 0;

    let recommendation = {
      en: 'Welcome! Solve your first quiz to earn score points and unlock personalized recommendations.',
      ar: 'مرحبًا بك! ابدأ بحل أول اختبار لتكسب نقاط XP وتبدأ مسيرتك في التصنيف الوطني.',
    };

    if (quizzesCompleted > 0) {
      if (accuracy >= 90) {
        recommendation = {
          en: `${data.studentName} is excelling with ${accuracy}% accuracy and ${xp} XP! Keep solving quizzes to reach the #1 Egyptian rank.`,
          ar: `أداء استثنائي لـ ${data.studentName} بدقة ${accuracy}% ورصيد ${xp} XP! واصل حل الاختبارات لتصل للمركز الأول على مصر.`,
        };
      } else if (accuracy >= 75) {
        recommendation = {
          en: `Great job ${data.studentName}! You earned ${xp} XP with ${accuracy}% accuracy. Practice tricky distractors to push into the top 5!`,
          ar: `عمل رائع ${data.studentName}! حصلت على ${xp} XP بنسبة نجاح ${accuracy}%. راجع الأسئلة الصعبة لتقترب من المراكز الخمسة الأولى!`,
        };
      } else {
        recommendation = {
          en: `Good effort ${data.studentName}! Review the explanations for incorrect answers to boost your score points and weekly rank.`,
          ar: `جهد طيب ${data.studentName}! راجع شروحات الأسئلة الخاطئة لترفع رصيد نقاطك وترتقي في تصنيف الطلاب.`,
        };
      }
    }

    return {
      cefrLevel,
      cefrLabel,
      weeklyGoalHours: { done: Math.min(studyHours, 5), target: 5 },
      vocabularyWords: quizzesCompleted * 15,
      quizAccuracy: accuracy,
      syllabus: { completed: Math.min(quizzesCompleted, 28), total: 28 },
      studyHours,
      studyHoursDelta: quizzesCompleted > 0 ? 1.5 : 0,
      streakDays: data.streakDays,
      bestStreakDays: data.bestStreakDays,
      quizzesCompleted,
      weeklyActivity: data.weeklyActivity,
      weeklyFocus: quizzesCompleted > 0
        ? { en: 'Grammar mastery & Thanawya questions', ar: 'إتقان القواعد وأسئلة امتحانات الثانوية' }
        : { en: 'Start with Unit 1 Quiz to earn your first XP', ar: 'ابدأ باختبار الوحدة 1 لتكسب أول نقاطك' },
      skills: [
        { key: 'grammar', percent: grammarPct, level: skillLevel(grammarPct) },
        { key: 'vocabulary', percent: vocabPct, level: skillLevel(vocabPct) },
        { key: 'speaking', percent: speakingPct, level: skillLevel(speakingPct) },
      ],
      recommendation,
    };
  }

  /**
   * Record quiz result, calculate score points (XP), and update ranking
   * Every right answer adds score points!
   */
  async recordQuizResult(
    quizId: string,
    correct: number,
    total: number,
    percent: number,
    xpEarnedOverride?: number
  ): Promise<number> {
    const user = this.auth.user();
    const userId = user?.id;

    // Calculate score points (XP):
    // 25 XP per correct answer
    // +75 XP bonus for 100% perfect score
    // +50 XP bonus for 85%+ high accuracy
    // +25 XP bonus for 70%+ passing
    // +25 XP completion bonus
    let xpEarned = xpEarnedOverride ?? (correct * 25);
    if (!xpEarnedOverride) {
      if (percent === 100) xpEarned += 75;
      else if (percent >= 85) xpEarned += 50;
      else if (percent >= 70) xpEarned += 25;
      if (correct > 0) xpEarned += 25;
    }

    // 1. Update Local Storage immediately (reliable offline & online)
    const local = this.loadLocalProgress(userId);
    local.xp += xpEarned;
    local.quizzesCompleted += 1;
    local.totalCorrect += correct;
    local.totalAnswered += total;

    // Update study time (~35 seconds per question answered)
    local.studyHours = Math.round((local.studyHours + (total * 35) / 3600) * 10) / 10;

    // Update Streak
    const today = new Date().toLocaleDateString('en-CA');
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
    if (local.lastActiveDate !== today) {
      local.streakDays = local.lastActiveDate === yesterday ? local.streakDays + 1 : 1;
      local.bestStreakDays = Math.max(local.streakDays, local.bestStreakDays);
      local.lastActiveDate = today;
    }

    // Update Weekly Activity
    const dayMap: WeekDay[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const currentDay = dayMap[new Date().getDay()];
    const dayItem = local.weeklyActivity.find(d => d.day === currentDay);
    if (dayItem) {
      dayItem.minutes += Math.max(5, Math.round((total * 40) / 60));
    }

    // Save completed quiz details
    local.completedQuizzes[quizId] = {
      correct,
      total,
      percent,
      xpEarned,
    };

    this.saveLocalProgress(local, userId);

    // 2. Sync to Supabase in background if user is authenticated
    if (userId && !userId.startsWith('usr_')) {
      try {
        const { data: existing } = await this.supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        const now = new Date().toISOString();

        if (existing) {
          await this.supabase
            .from('user_progress')
            .update({
              xp: local.xp,
              quizzes_completed: local.quizzesCompleted,
              total_correct: local.totalCorrect,
              total_answered: local.totalAnswered,
              streak_days: local.streakDays,
              best_streak_days: local.bestStreakDays,
              study_hours: local.studyHours,
              last_active_date: today,
              weekly_activity: JSON.stringify(local.weeklyActivity),
              updated_at: now,
            })
            .eq('user_id', userId);
        } else {
          await this.supabase
            .from('user_progress')
            .insert({
              user_id: userId,
              xp: local.xp,
              quizzes_completed: local.quizzesCompleted,
              total_correct: local.totalCorrect,
              total_answered: local.totalAnswered,
              streak_days: local.streakDays,
              best_streak_days: local.bestStreakDays,
              study_hours: local.studyHours,
              last_active_date: today,
              weekly_activity: JSON.stringify(local.weeklyActivity),
              created_at: now,
              updated_at: now,
            });
        }

        await this.supabase
          .from('quiz_attempts')
          .insert({
            user_id: userId,
            quiz_id: quizId,
            correct,
            total,
            percent,
            xp_earned: xpEarned,
            completed_at: now,
          });
      } catch (err) {
        console.warn('Supabase progress sync deferred:', err);
      }
    }

    // 3. Trigger reactive update for all UI subscribers
    this.progressChange$.next(Date.now());

    return xpEarned;
  }

  /**
   * GET /api/leaderboard - Top Egyptian Students National weekly XP ranking
   * Dynamically places the user at their real earned XP and ranks all students
   */
  getLeaderboard(): Observable<LeaderboardEntry[]> {
    return this.progressChange$.pipe(
      switchMap(() => {
        const user = this.auth.user();
        const local = this.loadLocalProgress(user?.id);
        const currentXp = local.xp;

        const currentNameEn = user?.fullName || 'You';
        const currentNameAr = user?.fullName || 'أنت';
        const currentCityEn = 'Cairo';
        const currentCityAr = 'القاهرة';

        // Build list with baseline Egyptian students cohort + current user
        const entries: LeaderboardEntry[] = [
          ...EGYPTIAN_STUDENTS_COHORT.map(s => ({
            rank: 0,
            name: s.name,
            city: s.city,
            xp: s.xp,
            isCurrentUser: false,
          })),
          {
            rank: 0,
            name: { en: currentNameEn, ar: currentNameAr },
            city: { en: currentCityEn, ar: currentCityAr },
            xp: currentXp,
            isCurrentUser: true,
          },
        ];

        // Sort dynamically by XP in descending order
        entries.sort((a, b) => b.xp - a.xp);

        // Assign ranks (1 to N)
        entries.forEach((item, index) => {
          item.rank = index + 1;
        });

        return of(entries);
      })
    );
  }

  /** GET /api/me/achievements - Dynamic based on earned XP and quiz milestones */
  getAchievements(): Observable<Achievement[]> {
    return this.progressChange$.pipe(
      map(() => {
        const user = this.auth.user();
        const local = this.loadLocalProgress(user?.id);
        const xp = local.xp;
        const quizzes = local.quizzesCompleted;
        const accuracy = local.totalAnswered > 0 ? (local.totalCorrect / local.totalAnswered) * 100 : 0;

        const achievements: Achievement[] = [];

        if (quizzes >= 1) {
          achievements.push({
            id: 'first_quiz',
            icon: 'trophy',
            title: { en: 'First Victory', ar: 'الانتصار الأول' },
            description: { en: 'Completed your first quiz & joined the national leaderboard!', ar: 'أكملت أول اختبار ودخلت التصنيف الوطني!' },
          });
        }

        if (accuracy >= 85 && quizzes >= 1) {
          achievements.push({
            id: 'high_accuracy',
            icon: 'medal',
            title: { en: 'Grammar Sharpshooter', ar: 'قناص القواعد' },
            description: { en: 'Achieved 85%+ score on a quiz', ar: 'حققت نسبة 85%+ في اختبار' },
          });
        }

        if (xp >= 200) {
          achievements.push({
            id: 'xp_200',
            icon: 'flame',
            title: { en: 'Rising Contender', ar: 'منافس صاعد' },
            description: { en: 'Earned 200+ XP in the Egyptian Students Cohort', ar: 'جمعت 200+ نقطة في تصنيف طلاب مصر' },
          });
        }

        if (xp >= 500) {
          achievements.push({
            id: 'xp_500',
            icon: 'trophy',
            title: { en: 'Top 10 Challenger', ar: 'متحدي العشرة الأوائل' },
            description: { en: 'Surpassed 500 XP and climbing the national ranks!', ar: 'تجاوزت 500 XP وبدأت صعود المراتب الأولى!' },
          });
        }

        if (xp >= 1500) {
          achievements.push({
            id: 'xp_1500',
            icon: 'medal',
            title: { en: 'Elite Scholar', ar: 'نخبة المتفوقين' },
            description: { en: 'Surpassed 1,500 XP into the national top tier', ar: 'تجاوزت 1,500 XP ودخلت الفئة الممتازة وطنيًا' },
          });
        }

        if (local.streakDays >= 3) {
          achievements.push({
            id: 'streak_3',
            icon: 'flame',
            title: { en: 'Consistent Mastery', ar: 'إتقان متواصل' },
            description: { en: '3-day continuous learning streak', ar: 'سلسلة 3 أيام متتالية من التعلم' },
          });
        }

        return achievements;
      })
    );
  }
}
