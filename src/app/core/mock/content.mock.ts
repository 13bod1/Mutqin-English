// PLACEHOLDER DATA — replace with backend responses. Names and reviews are illustrative only.
import { Instructor, PlatformStats, Testimonial } from '../models/content';

export const PLATFORM_STATS_MOCK: PlatformStats = {
  rating: 4.9,
  studentsCount: 1200,
};

export const INSTRUCTOR_MOCK: Instructor = {
  name: { en: 'Mr. Adel Mostafa', ar: 'أ. عادل مصطفى' },
  title: { en: 'Senior English Teacher & Mentor', ar: 'معلم لغة إنجليزية أول وخبير تربوي' },
  credential: {
    en: '20+ Years of Excellence & Inspiring Generations',
    ar: 'أكثر من 20 عامًا من التميز وإلهام الأجيال',
  },

  bio: {
    en: 'Mr. Adel Mostafa is a highly accomplished and dedicated Senior English Teacher with over two decades of rich experience in inspiring, educating, and mentoring students. Throughout an illustrious career, he has successfully nurtured consecutive generations of learners, employing modern active and interactive learning strategies that balance a robust linguistic foundation with critical thinking skills.',
    ar: 'أ. عادل مصطفى هو معلم لغة إنجليزية أول متميز ومخلص يتمتع بخبرة تزيد عن عقدين في إلهام وتعليم وتوجيه الطلاب. وطوال مسيرته المهنية الحافلة، نجح في تنشئة أجيال متعاقبة من المتعلمين، متبعًا استراتيجيات تعلّم حديثة ونشطة وتفاعلية توازن بين التأسيس اللغوي القوي ومهارات التفكير النقدي.',
  },
  quote: {
    en: 'We balance a robust linguistic foundation with critical thinking skills, empowering every student to speak and succeed with true mastery.',
    ar: 'نوازن بين التأسيس اللغوي القوي ومهارات التفكير النقدي، لنمكن كل طالب من التحدث والنجاح بإتقان حقيقي.',
  },
  quoteAuthor: { en: 'Mr. Adel Mostafa', ar: 'أ. عادل مصطفى' },
  photoUrl: 'images/adel-mostafa.png',
  stats: [
    { value: '20+', label: { en: 'Years Experience', ar: 'سنوات خبرة' } },
    { value: '10,000+', label: { en: 'Students Mentored', ar: 'طالب متفوق' } },
    { value: '100%', label: { en: 'Dedication & Mastery', ar: 'إتقان وتميز' } },
  ],
};

export const TESTIMONIALS_MOCK: Testimonial[] = [
  {
    id: 't1',
    name: { en: 'Omar Al-Mansoor', ar: 'عمر المنصور' },
    location: { en: 'Cairo, Egypt', ar: 'القاهرة، مصر' },
    rating: 5,
    quote: {
      en: "I used to freeze whenever native speakers spoke to me. Teacher Kareem's phonetics breakdown fixed my pronunciation within 4 weeks, and I cleared my university admissions interview.",
      ar: 'كنت أتجمد كلما تحدث معي أحد بالإنجليزية. شرح المعلم كريم للنطق حل مشكلتي خلال 4 أسابيع، واجتزت مقابلة القبول في الجامعة.',
    },
  },
  {
    id: 't2',
    name: { en: 'Fatima Al-Zahra', ar: 'فاطمة الزهراء' },
    location: { en: 'Alexandria, Egypt', ar: 'الإسكندرية، مصر' },
    rating: 5,
    quote: {
      en: 'The recorded lessons with bilingual captions are pure gold. I downloaded the transcripts, practiced on the commute, and scored 7.5 on my IELTS Academic exam.',
      ar: 'الدروس المسجلة بترجمة باللغتين كنز حقيقي. حمّلت النصوص وتدربت أثناء المواصلات، وحصلت على 7.5 في اختبار IELTS الأكاديمي.',
    },
  },
  {
    id: 't3',
    name: { en: 'Yousef Haddad', ar: 'يوسف حداد' },
    location: { en: 'Riyadh, Saudi Arabia', ar: 'الرياض، السعودية' },
    rating: 5,
    quote: {
      en: 'Mutqin English treated me like an adult learner. Instead of childish drills, we worked on real business communication, and I landed a senior role at a multinational agency.',
      ar: 'تعامل معي متقن إنجليش كمتعلم ناضج. بدل التمارين الطفولية، عملنا على تواصل حقيقي في بيئة العمل، وحصلت على وظيفة قيادية في شركة دولية.',
    },
  },
];
