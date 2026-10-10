import { inject, Injectable } from '@angular/core';
import { catchError, from, map, Observable, of } from 'rxjs';
import { ACHIEVEMENTS_MOCK } from '../mock/progress.mock';
import { Achievement, LeaderboardEntry, ProgressSummary, StudentProfile } from '../models/progress';
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

/** Default zeroed-out summary for new users */
const ZERO_SUMMARY: ProgressSummary = {
  cefrLevel: 'A1',
  cefrLabel: { en: 'A1 Beginner', ar: 'A1 مبتدئ' },
  weeklyGoalHours: { done: 0, target: 5 },
  vocabularyWords: 0,
  quizAccuracy: 0,
  syllabus: { completed: 0, total: 28 },
  studyHours: 0,
  studyHoursDelta: 0,
  streakDays: 0,
  bestStreakDays: 0,
  quizzesCompleted: 0,
  weeklyActivity: [
    { day: 'sat', minutes: 0 },
    { day: 'sun', minutes: 0 },
    { day: 'mon', minutes: 0 },
    { day: 'tue', minutes: 0 },
    { day: 'wed', minutes: 0 },
    { day: 'thu', minutes: 0 },
    { day: 'fri', minutes: 0 },
  ],
  weeklyFocus: { en: 'Get started with your first quiz!', ar: 'ابدأ باختبارك الأول!' },
  skills: [
    { key: 'grammar', percent: 0, level: 'developing' },
    { key: 'vocabulary', percent: 0, level: 'developing' },
    { key: 'speaking', percent: 0, level: 'developing' },
  ],
  recommendation: {
    en: 'Welcome! Complete your first quiz to receive a personalized AI recommendation.',
    ar: 'مرحبًا! أكمل اختبارك الأول لتحصل على توصية شخصية بالذكاء الاصطناعي.',
  },
};

@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseService);

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

  /** GET /api/me/progress - Real progress starting from zero */
  getSummary(): Observable<ProgressSummary> {
    const user = this.auth.user();
    const studentName = user?.fullName || 'Student';

    if (user?.id && !user.id.startsWith('usr_')) {
      return from(
        this.supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()
      ).pipe(
        map(({ data, error }) => {
          if (error || !data) {
            // New user → all zeros
            return { ...ZERO_SUMMARY };
          }
          return this.buildSummaryFromDB(data, studentName);
        }),
        catchError(() => of({ ...ZERO_SUMMARY }))
      );
    }

    // Not logged in or local user → zeros
    return of({ ...ZERO_SUMMARY });
  }

  private buildSummaryFromDB(data: any, studentName: string): ProgressSummary {
    const quizzesCompleted = data.quizzes_completed || 0;
    const totalCorrect = data.total_correct || 0;
    const totalAnswered = data.total_answered || 0;
    const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 1000) / 10 : 0;
    const xp = data.xp || 0;
    const streakDays = data.streak_days || 0;
    const bestStreak = data.best_streak_days || 0;
    const studyHours = data.study_hours || 0;

    // Calculate CEFR level based on XP
    let cefrLevel = 'A1';
    let cefrLabel = { en: 'A1 Beginner', ar: 'A1 مبتدئ' };
    if (xp >= 5000) { cefrLevel = 'C1'; cefrLabel = { en: 'C1 Advanced', ar: 'C1 متقدم' }; }
    else if (xp >= 3000) { cefrLevel = 'B2'; cefrLabel = { en: 'B2 Upper-Intermediate', ar: 'B2 فوق المتوسط' }; }
    else if (xp >= 1500) { cefrLevel = 'B1'; cefrLabel = { en: 'B1 Intermediate', ar: 'B1 متوسط' }; }
    else if (xp >= 500) { cefrLevel = 'A2'; cefrLabel = { en: 'A2 Elementary', ar: 'A2 مبتدئ متقدم' }; }

    // Determine skill level from accuracy
    const skillLevel = (pct: number) => {
      if (pct >= 90) return 'excellent' as const;
      if (pct >= 75) return 'proficient' as const;
      if (pct >= 50) return 'good' as const;
      return 'developing' as const;
    };

    const grammarPct = data.grammar_accuracy || 0;
    const vocabPct = data.vocab_accuracy || 0;
    const speakingPct = Math.min(100, Math.round(studyHours * 3));

    // Build recommendation
    let recommendation = {
      en: `Welcome ${studentName}! Complete quizzes to get personalized insights.`,
      ar: `مرحبًا ${studentName}! أكمل الاختبارات للحصول على توصيات مخصصة.`,
    };
    if (quizzesCompleted > 0) {
      if (accuracy >= 90) {
        recommendation = {
          en: `${studentName} demonstrates excellent mastery with ${accuracy}% accuracy! Keep pushing to maintain your top rank.`,
          ar: `يُظهر ${studentName} تفوقًا ملحوظًا بنسبة ${accuracy}%! استمر في الحفاظ على صدارتك.`,
        };
      } else if (accuracy >= 70) {
        recommendation = {
          en: `Great progress ${studentName}! Your ${accuracy}% accuracy shows solid understanding. Focus on weak areas to reach excellence.`,
          ar: `تقدم رائع ${studentName}! نسبة ${accuracy}% تظهر فهمًا جيدًا. ركز على نقاط الضعف للوصول للتفوق.`,
        };
      } else {
        recommendation = {
          en: `Keep practicing ${studentName}! Review the quiz explanations carefully to improve your ${accuracy}% accuracy.`,
          ar: `واصل التدريب ${studentName}! راجع شروحات الاختبارات بعناية لتحسين نسبة ${accuracy}%.`,
        };
      }
    }

    return {
      cefrLevel,
      cefrLabel,
      weeklyGoalHours: { done: Math.min(studyHours, 5), target: 5 },
      vocabularyWords: data.vocabulary_words || quizzesCompleted * 15,
      quizAccuracy: accuracy,
      syllabus: { completed: Math.min(quizzesCompleted, 28), total: 28 },
      studyHours,
      studyHoursDelta: data.study_hours_delta || 0,
      streakDays,
      bestStreakDays: bestStreak,
      quizzesCompleted,
      weeklyActivity: data.weekly_activity ? JSON.parse(data.weekly_activity) : ZERO_SUMMARY.weeklyActivity,
      weeklyFocus: quizzesCompleted > 0
        ? { en: 'Grammar patterns & active recall', ar: 'أنماط القواعد والاسترجاع النشط' }
        : ZERO_SUMMARY.weeklyFocus,
      skills: [
        { key: 'grammar', percent: grammarPct, level: skillLevel(grammarPct) },
        { key: 'vocabulary', percent: vocabPct, level: skillLevel(vocabPct) },
        { key: 'speaking', percent: speakingPct, level: skillLevel(speakingPct) },
      ],
      recommendation,
    };
  }

  /** Record quiz result and award XP */
  async recordQuizResult(quizId: string, correct: number, total: number, percent: number): Promise<number> {
    const user = this.auth.user();
    if (!user?.id || user.id.startsWith('usr_')) return 0;

    // Calculate XP: base 10 per question correct + bonus for high accuracy
    let xpEarned = correct * 10;
    if (percent >= 90) xpEarned += 50;  // Excellence bonus
    else if (percent >= 80) xpEarned += 25;  // Good bonus
    else if (percent >= 70) xpEarned += 10;  // Passing bonus

    try {
      // Get current progress
      const { data: existing } = await this.supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const now = new Date().toISOString();
      const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

      if (existing) {
        // Update existing progress
        const lastActive = existing.last_active_date || '';
        const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
        let newStreak = existing.streak_days || 0;
        if (lastActive !== today) {
          newStreak = lastActive === yesterday ? newStreak + 1 : 1;
        }
        const bestStreak = Math.max(newStreak, existing.best_streak_days || 0);

        // Update weekly activity
        const dayIndex = new Date().getDay(); // 0=Sun
        const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        let weeklyActivity;
        try {
          weeklyActivity = JSON.parse(existing.weekly_activity || '[]');
        } catch {
          weeklyActivity = ZERO_SUMMARY.weeklyActivity;
        }
        if (weeklyActivity.length === 7) {
          const dayKey = dayMap[dayIndex];
          const dayEntry = weeklyActivity.find((d: any) => d.day === dayKey);
          if (dayEntry) dayEntry.minutes += Math.round((total * 30) / 60); // ~30 sec per question
        }

        await this.supabase
          .from('user_progress')
          .update({
            xp: (existing.xp || 0) + xpEarned,
            quizzes_completed: (existing.quizzes_completed || 0) + 1,
            total_correct: (existing.total_correct || 0) + correct,
            total_answered: (existing.total_answered || 0) + total,
            grammar_accuracy: percent, // simplified: stores latest quiz accuracy
            vocab_accuracy: Math.round(((existing.vocab_accuracy || 0) + percent) / 2),
            streak_days: newStreak,
            best_streak_days: bestStreak,
            study_hours: Math.round(((existing.study_hours || 0) + (total * 0.5 / 60)) * 10) / 10,
            vocabulary_words: (existing.vocabulary_words || 0) + correct * 5,
            weekly_activity: JSON.stringify(weeklyActivity),
            last_active_date: today,
            updated_at: now,
          })
          .eq('user_id', user.id);
      } else {
        // Insert new progress row
        const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const dayIndex = new Date().getDay();
        const weeklyActivity = ZERO_SUMMARY.weeklyActivity.map(d => ({
          ...d,
          minutes: d.day === dayMap[dayIndex] ? Math.round((total * 30) / 60) : 0,
        }));

        await this.supabase
          .from('user_progress')
          .insert({
            user_id: user.id,
            xp: xpEarned,
            quizzes_completed: 1,
            total_correct: correct,
            total_answered: total,
            grammar_accuracy: percent,
            vocab_accuracy: percent,
            streak_days: 1,
            best_streak_days: 1,
            study_hours: Math.round((total * 0.5 / 60) * 10) / 10,
            study_hours_delta: 0,
            vocabulary_words: correct * 5,
            weekly_activity: JSON.stringify(weeklyActivity),
            last_active_date: today,
            updated_at: now,
          });
      }

      // Also record individual quiz attempt
      await this.supabase
        .from('quiz_attempts')
        .insert({
          user_id: user.id,
          quiz_id: quizId,
          correct,
          total,
          percent,
          xp_earned: xpEarned,
          completed_at: now,
        });

      return xpEarned;
    } catch (err) {
      console.warn('Failed to save quiz result:', err);
      return xpEarned;
    }
  }

  /** GET /api/leaderboard - Real leaderboard from Supabase */
  getLeaderboard(): Observable<LeaderboardEntry[]> {
    const user = this.auth.user();
    const currentName = user?.fullName || 'You';

    return from(
      this.supabase
        .from('user_progress')
        .select('user_id, xp, profiles!inner(full_name_en, full_name_ar, city_en, city_ar)')
        .order('xp', { ascending: false })
        .limit(10)
    ).pipe(
      map(({ data, error }) => {
        if (error || !data || data.length === 0) {
          // Return the user at rank 1 with 0 XP if no data
          return [{
            rank: 1,
            name: { en: currentName, ar: currentName },
            city: { en: 'Cairo', ar: 'القاهرة' },
            xp: 0,
            isCurrentUser: true,
          }];
        }

        const entries: LeaderboardEntry[] = data.map((row: any, i: number) => {
          const profile = row.profiles;
          return {
            rank: i + 1,
            name: {
              en: profile?.full_name_en || 'Student',
              ar: profile?.full_name_ar || 'طالب',
            },
            city: {
              en: profile?.city_en || 'Egypt',
              ar: profile?.city_ar || 'مصر',
            },
            xp: row.xp || 0,
            isCurrentUser: row.user_id === user?.id,
          };
        });

        // If current user not in top 10, add them
        if (user?.id && !entries.find(e => e.isCurrentUser)) {
          entries.push({
            rank: entries.length + 1,
            name: { en: currentName, ar: currentName },
            city: { en: 'Cairo', ar: 'القاهرة' },
            xp: 0,
            isCurrentUser: true,
          });
        }

        return entries;
      }),
      catchError(() => {
        // Fallback: show user alone
        return of([{
          rank: 1,
          name: { en: currentName, ar: currentName },
          city: { en: 'Cairo', ar: 'القاهرة' },
          xp: 0,
          isCurrentUser: true,
        }]);
      })
    );
  }

  /** GET /api/me/achievements - Dynamic based on progress */
  getAchievements(): Observable<Achievement[]> {
    const user = this.auth.user();
    if (!user?.id || user.id.startsWith('usr_')) {
      return of([]); // No achievements for guests
    }

    return from(
      this.supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
    ).pipe(
      map(({ data }) => {
        if (!data) return []; // No progress → no achievements

        const achievements: Achievement[] = [];
        const quizzes = data.quizzes_completed || 0;
        const accuracy = data.total_answered > 0
          ? Math.round((data.total_correct / data.total_answered) * 100)
          : 0;
        const streak = data.best_streak_days || 0;
        const xp = data.xp || 0;

        if (quizzes >= 1) {
          achievements.push({
            id: 'first_quiz',
            icon: 'trophy',
            title: { en: 'First Steps', ar: 'الخطوة الأولى' },
            description: { en: 'Completed your first quiz!', ar: 'أكملت اختبارك الأول!' },
          });
        }
        if (quizzes >= 5) {
          achievements.push({
            id: 'five_quizzes',
            icon: 'medal',
            title: { en: 'Quiz Explorer', ar: 'مستكشف الاختبارات' },
            description: { en: 'Completed 5 quizzes', ar: 'أكمل 5 اختبارات' },
          });
        }
        if (accuracy >= 90 && quizzes >= 3) {
          achievements.push({
            id: 'high_accuracy',
            icon: 'trophy',
            title: { en: 'Grammar Champion', ar: 'بطل القواعد' },
            description: { en: 'Scored 90%+ average across 3+ quizzes', ar: 'حقق معدل 90%+ في 3 اختبارات أو أكثر' },
          });
        }
        if (streak >= 3) {
          achievements.push({
            id: 'streak_3',
            icon: 'flame',
            title: { en: '3-Day Streak', ar: 'سلسلة 3 أيام' },
            description: { en: 'Studied 3 days in a row!', ar: 'درست 3 أيام متتالية!' },
          });
        }
        if (streak >= 7) {
          achievements.push({
            id: 'streak_7',
            icon: 'flame',
            title: { en: 'Week Warrior', ar: 'محارب الأسبوع' },
            description: { en: 'A full week of daily learning!', ar: 'أسبوع كامل من التعلم اليومي!' },
          });
        }
        if (xp >= 500) {
          achievements.push({
            id: 'xp_500',
            icon: 'medal',
            title: { en: 'Rising Star', ar: 'نجم صاعد' },
            description: { en: 'Earned 500+ XP points', ar: 'حصلت على 500+ نقطة XP' },
          });
        }
        if (xp >= 2000) {
          achievements.push({
            id: 'xp_2000',
            icon: 'trophy',
            title: { en: 'XP Legend', ar: 'أسطورة النقاط' },
            description: { en: 'Earned 2,000+ XP points!', ar: 'حصلت على 2000+ نقطة XP!' },
          });
        }

        return achievements;
      }),
      catchError(() => of([]))
    );
  }
}
