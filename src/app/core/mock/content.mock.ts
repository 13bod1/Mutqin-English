// PLACEHOLDER DATA — replace with backend responses. Names and reviews are illustrative only.
import { Instructor, PlatformStats, Testimonial } from '../models/content';

export const PLATFORM_STATS_MOCK: PlatformStats = {
  rating: 4.9,
  studentsCount: 1200,
};

export const INSTRUCTOR_MOCK: Instructor = {
  name: { en: 'Teacher Kareem', ar: 'المعلم كريم' },
  title: { en: 'Certified TEFL & Cambridge Delta Instructor', ar: 'مدرّس معتمد TEFL و Cambridge Delta' },
  credential: { en: '10,000+ coached hours for Arab students', ar: 'أكثر من 10,000 ساعة تدريس للطلاب العرب' },
  bio: {
    en: 'Teacher Kareem specializes in dismantling the specific hurdles Arabic speakers face — consonant clusters, vowel reductions, and the rhythm differences between English and Arabic.',
    ar: 'يتخصص المعلم كريم في تفكيك العقبات التي تواجه المتحدثين بالعربية تحديدًا — تجمّعات الحروف الساكنة، واختزال حروف العلة، والفروق الإيقاعية بين الإنجليزية والعربية.',
  },
  quote: {
    en: "We don't memorize word lists. We build communicative muscle memory so you can speak freely in interviews, travel, and university life.",
    ar: 'نحن لا نحفظ قوائم كلمات. نبني ذاكرة تواصل حقيقية لتتحدث بحرية في المقابلات والسفر والحياة الجامعية.',
  },
  quoteAuthor: { en: 'Kareem, Founder & Lead Instructor', ar: 'كريم، المؤسس وكبير المدرّسين' },
  stats: [
    { value: '8+', label: { en: 'Years experience', ar: 'سنوات خبرة' } },
    { value: '1,500+', label: { en: 'Successful students', ar: 'طالب ناجح' } },
    { value: '12+', label: { en: 'Comprehensive courses', ar: 'دورة شاملة' } },
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
