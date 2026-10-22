// Recorded lectures data with actual videos from Supabase Storage bucket 'recorded lecture'
import { ContinueWatchingItem, FeaturedLecture, Lecture } from '../models/lecture';

export const RECORDED_LECTURE_VIDEOS = [
  'https://lbzphsipfsvhfrareqky.supabase.co/storage/v1/object/public/recorded%20lecture/videoplayback.mp4',
  'https://lbzphsipfsvhfrareqky.supabase.co/storage/v1/object/public/recorded%20lecture/videoplayback%20(1).mp4',
  'https://lbzphsipfsvhfrareqky.supabase.co/storage/v1/object/public/recorded%20lecture/videoplayback%20(2).mp4',
  'https://lbzphsipfsvhfrareqky.supabase.co/storage/v1/object/public/recorded%20lecture/videoplayback%20(4).mp4',
  'https://lbzphsipfsvhfrareqky.supabase.co/storage/v1/object/public/recorded%20lecture/videoplayback%20(5).mp4',
  'https://lbzphsipfsvhfrareqky.supabase.co/storage/v1/object/public/recorded%20lecture/videoplayback%20(7).mp4',
];

export const LECTURES_MOCK: Lecture[] = [
  {
    id: 'l1',
    order: 1,
    stage: 'sec3',
    topic: 'grammar',
    durationMin: 24,
    unit: { en: 'Unit 1: Make or Do & Collocations', ar: 'الوحدة 1: المتلازمات (Make / Do)' },
    title: {
      en: 'Vocabulary Demystified: Advanced Collocations for Thanawya Amma',
      ar: 'المفردات ببساطة: متلازمات متقدمة للثانوية العامة',
    },
    description: {
      en: "Master the nuanced difference between 'make' and 'do' with recurring Egyptian exam questions and tricky distractors.",
      ar: "أتقن الفرق الدقيق بين 'make' و'do' من خلال أسئلة الامتحانات المصرية المتكررة والاختيارات المضللة.",
    },
    instructor: { en: 'Mr. Adel Mostafa', ar: 'أ. عادل مصطفى' },
    resources: { en: '2 PDF guides + 1 quiz', ar: 'ملفان PDF + اختبار' },
    videoUrl: RECORDED_LECTURE_VIDEOS[0],
  },
  {
    id: 'l2',
    access: { type: 'free' },
    order: 2,
    stage: 'university',
    topic: 'phonetics',
    durationMin: 19,
    unit: { en: 'Phonetics & Accent Polish', ar: 'الصوتيات وتحسين اللكنة' },
    title: {
      en: 'The Elusive Schwa /ə/ and Stress Patterns in British English',
      ar: 'صوت الشوا /ə/ وأنماط النبر في الإنجليزية البريطانية',
    },
    description: {
      en: 'Eliminate flat Arabic syllable stress by discovering how the neutral schwa sound creates authentic English rhythm.',
      ar: 'تخلّص من النبر العربي المسطّح واكتشف كيف يصنع صوت الشوا المحايد إيقاع الإنجليزية الطبيعي.',
    },
    instructor: { en: 'Mr. Adel Mostafa', ar: 'أ. عادل مصطفى' },
    resources: { en: '1 audio drill + 1 PDF guide', ar: 'تمرين صوتي + ملف PDF' },
    videoUrl: RECORDED_LECTURE_VIDEOS[1],
  },
  {
    id: 'l3',
    order: 3,
    stage: 'sec2',
    topic: 'grammar',
    durationMin: 31,
    unit: { en: 'Unit 6: Reported Speech', ar: 'الوحدة 6: الكلام المنقول' },
    title: {
      en: 'Reported Speech: Statements, Questions & Commands',
      ar: 'الكلام المنقول: الجمل الخبرية والأسئلة والأوامر',
    },
    description: {
      en: 'Step-by-step tense shifting, pronoun adjustments, and reported question word order made foolproof.',
      ar: 'تحويل الأزمنة وتعديل الضمائر وترتيب كلمات السؤال غير المباشر خطوة بخطوة بطريقة مضمونة.',
    },
    instructor: { en: 'Mr. Adel Mostafa', ar: 'أ. عادل مصطفى' },
    resources: { en: '3 practice sheets + video solution', ar: '3 أوراق تدريب + حل بالفيديو' },
    videoUrl: RECORDED_LECTURE_VIDEOS[2],
  },
  {
    id: 'l4',
    access: { type: 'paid', priceEgp: 150 },
    order: 4,
    stage: 'sec3',
    topic: 'exam',
    durationMin: 27,
    unit: { en: 'Reading Comprehension Tactics', ar: 'استراتيجيات فهم المقروء' },
    title: {
      en: 'Cracking Unseen Passages: Skimming, Scanning & Inference',
      ar: 'حل القطع غير المقررة: القراءة السريعة والبحث والاستنتاج',
    },
    description: {
      en: 'Learn the 5-minute paragraph breakdown technique that secures full marks in the Thanawya Amma reading section.',
      ar: 'تعلّم أسلوب تفكيك الفقرة في 5 دقائق لتضمن الدرجة النهائية في قطعة القراءة بالثانوية العامة.',
    },
    instructor: { en: 'Mr. Adel Mostafa', ar: 'أ. عادل مصطفى' },
    resources: { en: '2 practice sheets + 1 quiz', ar: 'ورقتا تدريب + اختبار' },
    videoUrl: RECORDED_LECTURE_VIDEOS[3],
  },
  {
    id: 'l5',
    order: 5,
    stage: 'sec3',
    topic: 'exam',
    durationMin: 35,
    unit: { en: 'Story Analysis: Great Expectations', ar: 'تحليل القصة: آمال عظيمة' },
    title: {
      en: "Pip's Transformation & Key Moral Themes (Chapters 1–6)",
      ar: 'تحوّل شخصية بِب والقيم الأخلاقية (الفصول 1–6)',
    },
    description: {
      en: 'Character arcs, the symbolism of the marshes, and model essay answers explained line by line.',
      ar: 'تطور الشخصيات ورمزية المستنقعات ونماذج إجابات المقال مشروحة سطرًا بسطر.',
    },
    instructor: { en: 'Mr. Adel Mostafa', ar: 'أ. عادل مصطفى' },
    resources: { en: '4 PDF guides + chapter summary', ar: '4 ملفات PDF + ملخص الفصول' },
    videoUrl: RECORDED_LECTURE_VIDEOS[4],
  },
  {
    id: 'l6',
    order: 6,
    stage: 'prep',
    topic: 'grammar',
    durationMin: 22,
    unit: { en: 'Prep 3 Milestone', ar: 'محطة الصف الثالث الإعدادي' },
    title: {
      en: 'Passive Voice Simplified: Present & Past Forms',
      ar: 'المبني للمجهول ببساطة: المضارع والماضي',
    },
    description: {
      en: 'Clear rules and interactive drills for preparatory students moving up to secondary school.',
      ar: 'قواعد واضحة وتمارين تفاعلية لطلاب الإعدادية المنتقلين إلى المرحلة الثانوية.',
    },
    instructor: { en: 'Mr. Adel Mostafa', ar: 'أ. عادل مصطفى' },
    resources: { en: '2 PDF guides + 1 quiz', ar: 'ملفان PDF + اختبار' },
    videoUrl: RECORDED_LECTURE_VIDEOS[5],
  },
  {
    id: 'l7',
    access: { type: 'paid', priceEgp: 200 },
    order: 7,
    stage: 'sec1',
    topic: 'phrasal',
    durationMin: 14,
    unit: { en: 'Phrasal Verbs Toolkit', ar: 'حقيبة الأفعال المركبة' },
    title: {
      en: 'Get, Take & Put: 30 Phrasal Verbs You Hear Every Day',
      ar: 'ثلاثون فعلًا مركبًا تسمعها يوميًا: Get, Take, Put',
    },
    description: {
      en: 'Learn the phrasal verbs that appear most in conversations and exams, with memorable example sentences.',
      ar: 'تعلّم الأفعال المركبة الأكثر ظهورًا في المحادثات والامتحانات مع أمثلة سهلة التذكر.',
    },
    instructor: { en: 'Mr. Adel Mostafa', ar: 'أ. عادل مصطفى' },
    resources: { en: '1 flashcard set + 1 quiz', ar: 'مجموعة بطاقات + اختبار' },
    videoUrl: RECORDED_LECTURE_VIDEOS[0],
  },
  {
    id: 'l8',
    order: 8,
    stage: 'sec1',
    topic: 'grammar',
    durationMin: 29,
    unit: { en: 'Common Errors', ar: 'أخطاء شائعة' },
    title: {
      en: 'Mastering Tricky Prepositions: In, On, At',
      ar: 'إتقان حروف الجر الصعبة: In, On, At',
    },
    description: {
      en: 'Why Arabic speakers mix up time and place prepositions, and a simple rule set to stop it for good.',
      ar: 'لماذا يخلط المتحدثون بالعربية بين حروف جر الزمان والمكان، ومجموعة قواعد بسيطة لإنهاء ذلك.',
    },
    instructor: { en: 'Mr. Adel Mostafa', ar: 'أ. عادل مصطفى' },
    resources: { en: '1 PDF guide + 1 quiz', ar: 'ملف PDF + اختبار' },
    videoUrl: RECORDED_LECTURE_VIDEOS[1],
  },
  {
    id: 'l9',
    order: 9,
    stage: 'sec2',
    topic: 'phonetics',
    durationMin: 12,
    unit: { en: 'Pronunciation Clinic', ar: 'عيادة النطق' },
    title: {
      en: 'P vs B and V vs F: Fixing the Classic Arabic Swaps',
      ar: 'علاج أشهر أخطاء النطق عند العرب: P/B و V/F',
    },
    description: {
      en: 'Minimal-pair drills that train your mouth to separate the sounds Arabic does not distinguish.',
      ar: 'تمارين أزواج صوتية تدرّب فمك على التفريق بين أصوات لا تميّزها العربية.',
    },
    instructor: { en: 'Mr. Adel Mostafa', ar: 'أ. عادل مصطفى' },
    resources: { en: '2 audio drills', ar: 'تمرينان صوتيان' },
    videoUrl: RECORDED_LECTURE_VIDEOS[2],
  },
];

export const CONTINUE_WATCHING_MOCK: ContinueWatchingItem[] = [
  {
    lecture: LECTURES_MOCK[0],
    percent: 65,
    minutesLeft: 12,
  },
  {
    lecture: LECTURES_MOCK[1],
    percent: 40,
    minutesLeft: 17,
  },
];

export const FEATURED_LECTURE_MOCK: FeaturedLecture = {
  title: { en: 'Mastering Conditional Sentences: Type 2 & 3', ar: 'إتقان الجمل الشرطية: النوع الثاني والثالث' },
  subtitle: {
    en: 'Instructor: Mr. Adel Mostafa • Thanawya Amma final revision track',
    ar: 'المدرّس: أ. عادل مصطفى • مسار المراجعة النهائية للثانوية العامة',
  },
  lessonLabel: { en: 'Lesson 04', ar: 'الدرس 04' },
  captionBefore: '“If he ',
  captionHighlight: 'had studied',
  captionAfter: ' earlier, he would have passed.”',
  note: {
    en: 'Third conditional: expresses regret or something impossible to change in the past (Past Perfect + would have + V3).',
    ar: 'الحالة الشرطية الثالثة: تعبّر عن ندم أو استحالة تغيير ما حدث في الماضي (Past Perfect + would have + V3).',
  },
  positionSec: 860,
  durationSec: 2330,
  videoUrl: RECORDED_LECTURE_VIDEOS[0],
};
