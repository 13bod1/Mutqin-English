// PLACEHOLDER DATA — replace with backend responses for the signed-in student.
import { Achievement, LeaderboardEntry, ProgressSummary, StudentProfile } from '../models/progress';

export const STUDENT_PROFILE_MOCK: StudentProfile = {
  fullName: { en: 'Ahmed Hassan El-Shafei', ar: 'أحمد حسن الشافعي' },
  initials: 'AH',
  stage: { en: 'Secondary Grade 3 · STEM School', ar: 'الصف الثالث الثانوي · مدرسة STEM' },
  goal: { en: 'Target: IELTS Academic Band 7.5', ar: 'الهدف: IELTS الأكاديمي 7.5' },
  city: { en: 'Cairo', ar: 'القاهرة' },
};

export const PROGRESS_SUMMARY_MOCK: ProgressSummary = {
  cefrLevel: 'B2',
  cefrLabel: { en: 'B2 Upper-Intermediate', ar: 'B2 فوق المتوسط' },
  weeklyGoalHours: { done: 4.2, target: 5 },
  vocabularyWords: 840,
  quizAccuracy: 89.4,
  syllabus: { completed: 22, total: 28 },
  studyHours: 34,
  studyHoursDelta: 4.5,
  streakDays: 12,
  bestStreakDays: 14,
  quizzesCompleted: 28,
  weeklyActivity: [
    { day: 'sat', minutes: 45 },
    { day: 'sun', minutes: 35 },
    { day: 'mon', minutes: 55 },
    { day: 'tue', minutes: 70 },
    { day: 'wed', minutes: 40 },
    { day: 'thu', minutes: 60 },
    { day: 'fri', minutes: 30 },
  ],
  weeklyFocus: { en: 'Complex passive voice & gerunds', ar: 'المبني للمجهول المركب والأسماء الفعلية' },
  skills: [
    { key: 'grammar', percent: 95, level: 'excellent' },
    { key: 'vocabulary', percent: 90, level: 'proficient' },
    { key: 'speaking', percent: 88, level: 'good' },
  ],
  recommendation: {
    en: 'Ahmed shows strong mastery of hypothetical conditionals and academic discourse markers. To move speaking from 88% to 95%, practice reducing pauses when linking relative clauses in Unit 5 dialogues.',
    ar: 'يُظهر أحمد إتقانًا قويًا للجمل الشرطية الافتراضية وأدوات الربط الأكاديمية. للانتقال بمهارة التحدث من 88% إلى 95%، تدرّب على تقليل التوقف عند ربط الجمل الموصولة في حوارات الوحدة 5.',
  },
};

export const LEADERBOARD_MOCK: LeaderboardEntry[] = [
  { rank: 1, name: { en: 'Mariam Tarek', ar: 'مريم طارق' }, city: { en: 'Cairo', ar: 'القاهرة' }, xp: 3890 },
  { rank: 2, name: { en: 'Omar Sherif', ar: 'عمر شريف' }, city: { en: 'Alexandria', ar: 'الإسكندرية' }, xp: 3420 },
  { rank: 3, name: { en: 'Nour El-Hoda', ar: 'نور الهدى' }, city: { en: 'Mansoura', ar: 'المنصورة' }, xp: 3110 },
  { rank: 4, name: { en: 'Youssef Ibrahim', ar: 'يوسف إبراهيم' }, city: { en: 'Giza', ar: 'الجيزة' }, xp: 2780 },
  {
    rank: 5,
    name: { en: 'Ahmed Hassan', ar: 'أحمد حسن' },
    city: { en: 'Cairo', ar: 'القاهرة' },
    xp: 2450,
    isCurrentUser: true,
  },
];

export const ACHIEVEMENTS_MOCK: Achievement[] = [
  {
    id: 'a1',
    icon: 'trophy',
    title: { en: 'Grammar Champion', ar: 'بطل القواعد' },
    description: { en: 'Scored 95%+ in 10 consecutive quizzes', ar: 'حقق 95%+ في 10 اختبارات متتالية' },
  },
  {
    id: 'a2',
    icon: 'flame',
    title: { en: '10-Day Streak Master', ar: 'سلسلة 10 أيام' },
    description: { en: 'Consistent daily practice, unbroken', ar: 'تدريب يومي متواصل دون انقطاع' },
  },
  {
    id: 'a3',
    icon: 'headphones',
    title: { en: 'Active Listener', ar: 'مستمع نشط' },
    description: { en: 'Completed 15 interactive audio dialogues', ar: 'أكمل 15 حوارًا صوتيًا تفاعليًا' },
  },
  {
    id: 'a4',
    icon: 'medal',
    title: { en: 'Unit Leader', ar: 'متصدر الوحدة' },
    description: { en: '1st place in the Unit 4 quiz across your cohort', ar: 'المركز الأول في اختبار الوحدة 4 بين زملائك' },
  },
];
