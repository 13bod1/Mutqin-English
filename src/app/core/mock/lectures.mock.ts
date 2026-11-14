// Recorded lectures data with actual videos from Supabase Storage bucket 'recorded lecture'
import { ContinueWatchingItem, FeaturedLecture, Lecture, TranscriptItem } from '../models/lecture';

export const RECORDED_LECTURE_VIDEOS = [
  'https://lbzphsipfsvhfrareqky.supabase.co/storage/v1/object/public/recorded%20lecture/videoplayback.mp4',
  'https://lbzphsipfsvhfrareqky.supabase.co/storage/v1/object/public/recorded%20lecture/videoplayback%20(1).mp4',
  'https://lbzphsipfsvhfrareqky.supabase.co/storage/v1/object/public/recorded%20lecture/videoplayback%20(2).mp4',
  'https://lbzphsipfsvhfrareqky.supabase.co/storage/v1/object/public/recorded%20lecture/videoplayback%20(4).mp4',
  'https://lbzphsipfsvhfrareqky.supabase.co/storage/v1/object/public/recorded%20lecture/videoplayback%20(5).mp4',
  'https://lbzphsipfsvhfrareqky.supabase.co/storage/v1/object/public/recorded%20lecture/videoplayback%20(7).mp4',
];

export const LECTURE_TRANSCRIPTS: Record<string, TranscriptItem[]> = {
  featured: [
    { startSec: 0, endSec: 25, textEn: "Hello everyone, welcome back. Today we're mastering conditional sentences: Types 2 & 3.", textAr: "أهلاً بكم جميعاً. اليوم سنتقن الجمل الشرطية: النوعين الثاني والثالث بالتفصيل." },
    { startSec: 25, endSec: 65, textEn: "In Thanawya Amma exams, conditionals are among the most tested grammar topics.", textAr: "في امتحانات الثانوية العامة، تعتبر الجمل الشرطية من أكثر موضوعات القواعد تكراراً." },
    { startSec: 65, endSec: 120, textEn: "Let's review Type 2 first: 'If + Past Simple, would + infinitive'. It expresses unreal situations now.", textAr: "دعونا نراجع النوع الثاني: 'If + ماضي بسيط, would + مصدر'. يعبر عن مواقف غير حقيقية حالياً." },
    { startSec: 120, endSec: 190, textEn: "Example: 'If I had enough time, I would join the revision course.' Notice that 'had' is past, but meaning is present.", textAr: "مثال: 'لو كان لدي وقت كافٍ، لاشتركت في كورس المراجعة'. لاحظ أن الفعل ماضي ولكن الدلالة حاضرة." },
    { startSec: 190, endSec: 260, textEn: "Now let's examine Type 3: 'If + Past Perfect (had + V3), would have + past participle'.", textAr: "والآن ننتقل للنوع الثالث: 'If + ماضي تام (had + V3), would have + تصريف ثالث'." },
    { startSec: 260, endSec: 340, textEn: "Type 3 expresses regret or impossibility about the past: 'If he had studied earlier, he would have passed.'", textAr: "النوع الثالث يعبر عن الندم أو استحالة تغيير ما حدث في الماضي: 'لو كان قد ذاكر مبكراً، لكان قد نجح'." },
    { startSec: 340, endSec: 420, textEn: "Notice the golden exam rule: past time indicators like 'yesterday' trigger Type 3.", textAr: "لاحظ القاعدة الذهبية للامتحان: الكلمات الدالة على الماضي مثل 'أمس' تتطلب استخدام النوع الثالث." },
    { startSec: 420, endSec: 520, textEn: "Now let's solve these trick questions from previous Thanawya Amma models together.", textAr: "والآن دعونا نحل معاً هذه الأسئلة الخادعة من نماذج امتحانات الثانوية العامة السابقة." }
  ],
  l1: [
    { startSec: 0, endSec: 20, textEn: "Welcome students to Unit 1: Vocabulary Demystified & Collocations.", textAr: "أهلاً بكم يا شباب في الوحدة الأولى: كشف أسرار المفردات والمتلازمات اللفظية." },
    { startSec: 20, endSec: 55, textEn: "Collocations are word partnerships that sound natural to native English speakers.", textAr: "المتلازمات اللفظية هي كلمات تأتي معاً بشكل طبيعي في الإنجليزية ويجب حفظها كما هي." },
    { startSec: 55, endSec: 110, textEn: "The core rule: 'Make' involves creating, producing, or causing something (make a decision, make a mistake, make noise).", textAr: "القاعدة الأساسية: 'Make' تستخدم عند إنشاء شيء جديد أو التسبب فيه (make a decision, make a mistake)." },
    { startSec: 110, endSec: 175, textEn: "'Do' is used for actions, obligations, tasks, and repetitive work (do homework, do research, do business).", textAr: "بينما 'Do' تستخدم للأنشطة والواجبات والمهام الروتينية (do homework, do research, do business)." },
    { startSec: 175, endSec: 240, textEn: "Trap question from Egyptian exams: Do we say 'make research' or 'do research'? It is always 'do research'!", textAr: "سؤال خادع من الامتحانات المصرية: هل نقول make research أم do research؟ الصحيح دائماً هو do research!" },
    { startSec: 240, endSec: 320, textEn: "Let's test ourselves with 5 quick exam scenarios. Write your answers down.", textAr: "والآن اختبر نفسك في 5 جمل من نماذج الوزارة. اكتب إجابتك وفكر جيداً." }
  ],
  l2: [
    { startSec: 0, endSec: 25, textEn: "Welcome to our Pronunciation & Accent Polish clinic on British English rhythm.", textAr: "أهلاً بكم في عيادة النطق وتحسين اللكنة وإتقان إيقاع الإنجليزية البريطانية." },
    { startSec: 25, endSec: 65, textEn: "The Schwa sound /ə/ is the single most common vowel sound in the English language.", textAr: "صوت الشوا /ə/ هو الصوت المتحرك الأكثر تكراراً وشيوعاً على الإطلاق في اللغة الإنجليزية." },
    { startSec: 65, endSec: 130, textEn: "Arabic speakers tend to pronounce every vowel clearly. In English, unstressed vowels reduce to schwa.", textAr: "المتحدثون بالعربية يميلون لنطق كل حرف متحرك بوضوح، بينما في الإنجليزية تختصر الحروف غير المنبورة إلى شوا." },
    { startSec: 130, endSec: 200, textEn: "Listen carefully: 'banana' is not /ba-na-na/, it is /bə-ˈnɑː-nə/. The first and last vowels are pure schwa.", textAr: "استمع بدقة: كلمة banana لا تنطق با-نا-نا، بل bə-ˈnɑː-nə، الحرف الأول والأخير كلاهما شوا محايد." },
    { startSec: 200, endSec: 290, textEn: "Notice stress shifting in word families: 'PHO-to-graph' -> 'pho-TO-gra-pher' -> 'pho-to-GRA-phic'.", textAr: "لاحظ كيف يتغير موضع النبر بين مشتقات الكلمة الواحدة: PHO-to-graph ثم pho-TO-gra-pher ثم pho-to-GRA-phic." }
  ],
  l3: [
    { startSec: 0, endSec: 30, textEn: "In Unit 6, we tackle Reported Speech: Statements, Questions, and Commands.", textAr: "في الوحدة السادسة، نتناول بالتفصيل قاعدة الكلام المنقول (المباشر وغير المباشر)." },
    { startSec: 30, endSec: 80, textEn: "When the reporting verb is in the past like 'said' or 'told', tenses shift one step back in time.", textAr: "عندما يكون فعل القول في الماضي مثل said أو told، نرجع بالأزمنة خطوة إلى الوراء." },
    { startSec: 80, endSec: 150, textEn: "Present Simple becomes Past Simple. Present Continuous becomes Past Continuous. Past Simple becomes Past Perfect.", textAr: "المضارع البسيط يصبح ماضي بسيط، والمضارع المستمر يصبح ماضي مستمر، والماضي البسيط يصبح ماضي تام." },
    { startSec: 150, endSec: 230, textEn: "For yes/no questions, we connect with 'if' or 'whether' and change question order back to subject + verb.", textAr: "في الأسئلة التي تبدأ بفعل مساعد نربط بـ if أو whether ونعيد ترتيب الجملة (فاعل ثم فعل)." },
    { startSec: 230, endSec: 310, textEn: "Example: 'Do you play tennis?' -> He asked me if I played tennis. No auxiliary 'do' in reported form!", textAr: "مثال: Do you play tennis? تصبح: He asked me if I played tennis بدون استخدام do في غير المباشر." }
  ],
  l4: [
    { startSec: 0, endSec: 25, textEn: "Today we reveal the 5-minute paragraph breakdown technique for unseen reading passages.", textAr: "اليوم نكشف أسلوب تفكيك الفقرة في 5 دقائق لضمان الدرجة النهائية في قطعة الفهم." },
    { startSec: 25, endSec: 75, textEn: "Never read the passage word-by-word on your first pass! You waste critical exam minutes.", textAr: "إياك وقراءة القطعة كلمة كلمة في المرة الأولى! هذا يضيع وقتاً ثميناً جداً في الامتحان." },
    { startSec: 75, endSec: 140, textEn: "Step 1: Read the questions first to know what keywords to look for during reading.", textAr: "الخطوة الأولى: اقرأ الأسئلة أولاً لتعرف الكلمات المفتاحية التي ستبحث عنها أثناء القراءة." },
    { startSec: 140, endSec: 220, textEn: "Step 2: Skim the first sentence of each paragraph. The topic sentence usually carries the core idea.", textAr: "الخطوة الثانية: اقرأ الجملة الأولى من كل فقرة سريعا، فالجملة الافتتاحية غالباً ما تحمل الفكرة الرئيسية." },
    { startSec: 220, endSec: 310, textEn: "Step 3: When encountering unknown words, deduce meaning from neighboring conjunctions like 'however' or 'because'.", textAr: "الخطوة الثالثة: عند مصادفة كلمة صعبة، استنتج معناها من سياق الروابط المحيطة بها مثل however أو because." }
  ],
  l5: [
    { startSec: 0, endSec: 30, textEn: "Welcome to our story analysis of Charles Dickens' masterpiece 'Great Expectations'.", textAr: "أهلاً بكم في التحليل الأدبي لرواية شارلز ديكنز الخالدة 'آمال عظيمة'." },
    { startSec: 30, endSec: 85, textEn: "We begin on the bleak Romney Marshes where young Pip meets the terrifying escaped convict Magwitch.", textAr: "نبدأ في مستنقعات رومني الكئيبة حيث يلتقي الصبي بِب بالسجين الهارب ماجوتش." },
    { startSec: 85, endSec: 160, textEn: "Notice Dickens' contrast between the warm blacksmith forge with Joe Gargery and the decaying Satis House with Miss Havisham.", textAr: "لاحظ التناقض البارع لديكنز بين دفء ورشة الحدادة مع جو جارجري وبين قصر ساتيس المتداعي مع مس هافيشام." },
    { startSec: 160, endSec: 250, textEn: "The central moral theme: True gentlemanhood is not defined by London wealth, but by loyalty and honesty.", textAr: "المغزى الأخلاقي الأهم: الرجولة الحقيقية لا تقاس بأموال وثياب لندن، بل بالوفاء ونقاء السريرة." }
  ],
  l6: [
    { startSec: 0, endSec: 25, textEn: "Passive voice simplified: Understand why and how we use the passive in English.", textAr: "المبني للمجهول ببساطة: افهم متى وكيف نستخدم صيغة المجهول في اللغة الإنجليزية." },
    { startSec: 25, endSec: 75, textEn: "We use passive when the action or object is more important than who performed it, or when the doer is unknown.", textAr: "نستخدم المجهول عندما يكون المفعول به أو الحدث أهم من الفاعل، أو عندما يكون الفاعل غير معروف." },
    { startSec: 75, endSec: 140, textEn: "The golden formula: Appropriate form of 'to be' + Past Participle (V3).", textAr: "القاعدة الذهبية الثابتة: شكل مناسب من فعل to be متبوعاً بالتصريف الثالث للفعل الرئيسي." },
    { startSec: 140, endSec: 220, textEn: "'The bridge was built in 1920.' Notice how 'was built' tells us past tense and singular subject.", textAr: "'بُني الجسر عام 1920'. لاحظ كيف تدل was built على زمن الماضي والمفرد للجسر." }
  ],
  l7: [
    { startSec: 0, endSec: 25, textEn: "Phrasal verbs toolkit: Master 30 essential verbs with Get, Take, and Put.", textAr: "حقيبة الأفعال المركبة: إتقان ثلاثين فعلاً ضرورياً مع Get و Take و Put." },
    { startSec: 25, endSec: 70, textEn: "A phrasal verb equals verb + preposition, creating an entirely new idiomatic meaning.", textAr: "الفعل المركب هو فعل مع حرف جر ينتج عنه معنى اصطلاحي جديد تماماً يختلف عن الفعل الأصلي." },
    { startSec: 70, endSec: 130, textEn: "'Get over' means recover from illness or sadness. 'Get along with' means have a friendly relationship.", textAr: "مثلاً Get over تعني يتعافى من مرض أو حزن، بينما Get along with تعني ينسجم ويكون على وفاق مع شخص." },
    { startSec: 130, endSec: 200, textEn: "'Put off' means postpone, while 'Put up with' means tolerate or endure an annoying situation.", textAr: "كذلك Put off تعني يؤجل، بينما Put up with تعني يتحمل أو يصبر على موقف مزعج." }
  ],
  l8: [
    { startSec: 0, endSec: 25, textEn: "Mastering tricky English prepositions: In, On, and At.", textAr: "إتقان حروف الجر الإنجليزية الدقيقة: In و On و At وتجنب الخلط الشائع." },
    { startSec: 25, endSec: 75, textEn: "Think of an inverted pyramid: 'In' is general and large, 'On' is more specific, 'At' is precise.", textAr: "تخيل مثلثاً مقلوباً: In للأعم والأكبر، On للأكثر تحديداً، و At للنقاط والمواعيد الدقيقة." },
    { startSec: 75, endSec: 140, textEn: "Time: 'In 2026', 'In July', 'In the morning'. 'On Monday', 'On July 14th'. 'At 7:00 PM', 'At midnight'.", textAr: "مع الوقت: In مع السنوات والشهور، On مع الأيام والتواريخ المحددة، At مع الساعات المحددة ونصف الليل." },
    { startSec: 140, endSec: 210, textEn: "Transportation trick: Can you walk inside it? Use 'on' (on the bus, on the plane). If not, use 'in' (in the car, in the taxi).", textAr: "قاعدة المواصلات الذهبية: هل تستطيع الوقوف والمشي داخلها؟ استخدم on (on the bus, on the train)، إن لم تستطع فاستخدم in (in the car, in a taxi)." }
  ],
  l9: [
    { startSec: 0, endSec: 25, textEn: "Pronunciation Clinic: Fixing the classic Arabic substitutions P vs B and V vs F.", textAr: "عيادة النطق: تصحيح الخلط الشهير بين أصوات P و B وبين V و F للمتحدثين بالعربية." },
    { startSec: 25, endSec: 70, textEn: "P is unvoiced with a puff of air. B is voiced without air puff. Put a paper in front of your lips to test it!", textAr: "حرف P مهموس يصاحبه اندفاع هواء، بينما B مجهور بدون هواء. ضع ورقة أمام شفتيك لتختبر اندفاع الهواء!" },
    { startSec: 70, endSec: 130, textEn: "Practice minimal pairs: 'park' vs 'bark', 'pear' vs 'bear', 'pack' vs 'back'.", textAr: "تدرب على الكلمات المتشابهة: park مقابل bark، و pear مقابل bear، و pack مقابل back." },
    { startSec: 130, endSec: 190, textEn: "For V vs F: Place your upper teeth gently on your bottom lip and turn on your vocal cords for V.", textAr: "ولصوت V مقابل F: ضع أسنانك العلوية على الشفة السفلية مع تشغيل اهتزاز الأحبال الصوتية لصوت V." }
  ]
};

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
    thumbnailUrl: '/images/thumb-grammar.svg',
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
    thumbnailUrl: '/images/thumb-phonetics.svg',
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
    thumbnailUrl: '/images/thumb-grammar.svg',
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
    thumbnailUrl: '/images/thumb-exam.svg',
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
    thumbnailUrl: '/images/thumb-exam.svg',
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
    thumbnailUrl: '/images/thumb-grammar.svg',
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
    thumbnailUrl: '/images/thumb-phrasal.svg',
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
    thumbnailUrl: '/images/thumb-grammar.svg',
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
    thumbnailUrl: '/images/thumb-phonetics.svg',
    videoUrl: RECORDED_LECTURE_VIDEOS[2],
  },
];

// Attach transcripts to all mock lectures
LECTURES_MOCK.forEach((l) => {
  l.transcript = LECTURE_TRANSCRIPTS[l.id] || LECTURE_TRANSCRIPTS['featured'];
});

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
  id: 'featured',
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
  transcript: LECTURE_TRANSCRIPTS['featured'],
};
