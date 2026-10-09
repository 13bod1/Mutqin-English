// PLACEHOLDER DATA — replace with backend responses.
import { QuizModule, QuizQuestion } from '../models/quiz';

export const QUIZ_MODULES_MOCK: QuizModule[] = [
  {
    id: 'sva',
    categories: ['grammar'],
    difficulty: 'easy',
    durationMin: 15,
    questionCount: 4,
    title: { en: 'Subject–Verb Agreement Nuances', ar: 'دقائق التوافق بين الفاعل والفعل' },
    description: {
      en: 'Master collective nouns, indefinite pronouns and intervening phrases that trip up test takers.',
      ar: 'أتقن أسماء الجمع والضمائر غير المحددة والعبارات الفاصلة التي توقع الطلاب في الخطأ.',
    },
  },
  {
    id: 'past',
    categories: ['grammar', 'exam'],
    difficulty: 'medium',
    durationMin: 15,
    questionCount: 4,
    recommended: true,
    title: { en: 'Past Tenses & Time Clauses', ar: 'أزمنة الماضي وجمل الوقت' },
    description: {
      en: "Past Perfect versus Past Simple with 'by the time', 'scarcely' and 'hardly'.",
      ar: "الماضي التام مقابل الماضي البسيط مع 'by the time' و'scarcely' و'hardly'.",
    },
  },
  {
    id: 'vocab',
    categories: ['vocabulary', 'phonetics', 'exam'],
    difficulty: 'advanced',
    durationMin: 20,
    questionCount: 4,
    title: { en: 'Thanawya Amma Final Exam Simulation', ar: 'محاكاة امتحان الثانوية العامة النهائي' },
    description: {
      en: 'Exam-style practice on idioms, phrasal verbs and collocations under time pressure.',
      ar: 'تدريب بنمط الامتحان على التعبيرات والأفعال المركبة والمتلازمات تحت ضغط الوقت.',
    },
  },
];

export const QUIZ_QUESTIONS_MOCK: Record<string, QuizQuestion[]> = {
  sva: [
    {
      id: 'sva1',
      topic: { en: 'Collective nouns', ar: 'أسماء الجمع' },
      before: 'The team ',
      after: ' training every morning before school.',
      options: ['are being', 'is', 'were', 'have'],
      correctIndex: 1,
      ruleTitle: { en: 'Collective nouns as one unit', ar: 'اسم الجمع كوحدة واحدة' },
      explanation: {
        en: "When 'team' acts as one group, it takes a singular verb: 'The team is training'.",
        ar: "عندما تعمل كلمة 'team' كمجموعة واحدة، تأخذ فعلًا مفردًا: 'The team is training'.",
      },
    },
    {
      id: 'sva2',
      topic: { en: 'Indefinite pronouns', ar: 'الضمائر غير المحددة' },
      before: 'Everyone in the class ',
      after: ' finished the homework.',
      options: ['have', 'has', 'are', 'were'],
      correctIndex: 1,
      ruleTitle: { en: 'Everyone / everybody are singular', ar: 'Everyone وeverybody مفردة' },
      explanation: {
        en: "Pronouns ending in -one or -body are grammatically singular, so we use 'has'.",
        ar: "الضمائر المنتهية بـ -one أو -body مفردة نحويًا، لذلك نستخدم 'has'.",
      },
      arabicTip: {
        en: "In Arabic 'الجميع' feels plural, so students often choose 'have'. Think 'every single one'.",
        ar: "كلمة 'الجميع' في العربية توحي بالجمع، لذلك يختار الطلاب 'have'. فكّر فيها كـ 'كل فرد على حدة'.",
      },
    },
    {
      id: 'sva3',
      topic: { en: 'Intervening phrases', ar: 'العبارات الفاصلة' },
      before: 'The box of chocolates ',
      after: ' on the table.',
      options: ['are', 'were', 'is', 'have been'],
      correctIndex: 2,
      ruleTitle: { en: 'Agree with the real subject', ar: 'طابق الفعل مع الفاعل الحقيقي' },
      explanation: {
        en: "The subject is 'box', not 'chocolates'. Ignore the 'of' phrase in between.",
        ar: "الفاعل هو 'box' وليس 'chocolates'. تجاهل عبارة 'of' الفاصلة.",
      },
    },
    {
      id: 'sva4',
      topic: { en: 'Neither … nor', ar: 'Neither … nor' },
      before: 'Neither the students nor the teacher ',
      after: ' ready for the trip.',
      options: ['was', 'were', 'are', 'have'],
      correctIndex: 0,
      ruleTitle: { en: 'Proximity rule', ar: 'قاعدة الأقرب' },
      explanation: {
        en: "With 'neither … nor', the verb agrees with the nearer subject: 'the teacher' → 'was'.",
        ar: "مع 'neither … nor' يتفق الفعل مع الفاعل الأقرب: 'the teacher' ← 'was'.",
      },
    },
  ],
  past: [
    {
      id: 'past1',
      topic: { en: 'Past tenses & time clauses', ar: 'أزمنة الماضي وجمل الوقت' },
      before: '“By the time the teacher arrived, the students ',
      after: ' their essays.”',
      options: ['had finished', 'have finished', 'finished', 'were finishing'],
      correctIndex: 0,
      ruleTitle: { en: 'Time clauses in the past', ar: 'جمل الوقت في الماضي' },
      explanation: {
        en: "'By the time' marks a deadline in the past. An action completed before that moment takes the Past Perfect (had finished).",
        ar: "تحدد 'By the time' موعدًا في الماضي. الفعل الذي اكتمل قبل تلك اللحظة يأتي في الماضي التام (had finished).",
      },
      arabicTip: {
        en: "In Egyptian Arabic we say 'خلصوا خلاص لما جه المدرس' with a simple past form, so students pick 'finished'. English needs had + past participle to show which came first.",
        ar: "في العامية نقول 'خلصوا خلاص لما جه المدرس' بصيغة الماضي البسيط، فيختار الطلاب 'finished'. الإنجليزية تحتاج had + التصريف الثالث لتوضيح أي الحدثين سبق.",
      },
    },
    {
      id: 'past2',
      topic: { en: 'Inversion with negative adverbials', ar: 'التقديم مع ظروف النفي' },
      before: 'Hardly ',
      after: ' speaking when the bell rang.',
      options: ['he had started', 'had he started', 'he started', 'did he started'],
      correctIndex: 1,
      ruleTitle: { en: 'Hardly / Scarcely + inversion', ar: 'Hardly وScarcely مع التقديم' },
      explanation: {
        en: 'When a sentence begins with Hardly, Scarcely or No sooner, formal English inverts the auxiliary and subject: had he started.',
        ar: 'عندما تبدأ الجملة بـ Hardly أو Scarcely أو No sooner، يُقدَّم الفعل المساعد على الفاعل: had he started.',
      },
    },
    {
      id: 'past3',
      topic: { en: 'Past continuous', ar: 'الماضي المستمر' },
      before: 'I ',
      after: ' dinner when my friend called.',
      options: ['cooked', 'was cooking', 'had cooked', 'have cooked'],
      correctIndex: 1,
      ruleTitle: { en: 'Interrupted actions', ar: 'الأفعال المقاطَعة' },
      explanation: {
        en: 'A longer action in progress (was cooking) is interrupted by a short one (called).',
        ar: 'فعل طويل كان مستمرًا (was cooking) قاطعه فعل قصير (called).',
      },
    },
    {
      id: 'past4',
      topic: { en: 'After / before', ar: 'After وBefore' },
      before: 'After she ',
      after: ' the letter, she posted it.',
      options: ['has written', 'had written', 'was writing', 'writes'],
      correctIndex: 1,
      ruleTitle: { en: 'Sequence with after', ar: 'ترتيب الأحداث مع after' },
      explanation: {
        en: "'After' introduces the earlier action, so it takes the Past Perfect: had written.",
        ar: "تقدّم 'After' الحدث الأسبق، لذلك يأتي في الماضي التام: had written.",
      },
    },
  ],
  vocab: [
    {
      id: 'v1',
      topic: { en: 'Make or do', ar: 'Make أو Do' },
      before: 'You should ',
      after: ' an effort to speak English every day.',
      options: ['do', 'make', 'take', 'give'],
      correctIndex: 1,
      ruleTitle: { en: 'Collocation: make an effort', ar: 'متلازمة: make an effort' },
      explanation: {
        en: "'Effort' collocates with 'make'. Other common ones: make a decision, make progress, make a mistake.",
        ar: "كلمة 'effort' تتلازم مع 'make'. أمثلة أخرى: make a decision وmake progress وmake a mistake.",
      },
    },
    {
      id: 'v2',
      topic: { en: 'Phrasal verbs', ar: 'الأفعال المركبة' },
      before: 'The meeting was ',
      after: ' because the manager was ill.',
      options: ['called off', 'called on', 'put up', 'taken off'],
      correctIndex: 0,
      ruleTitle: { en: 'call off = cancel', ar: 'call off = يلغي' },
      explanation: {
        en: "'Call off' means to cancel an event that was planned.",
        ar: "'Call off' تعني إلغاء حدث كان مخططًا له.",
      },
    },
    {
      id: 'v3',
      topic: { en: 'Idioms', ar: 'التعبيرات الاصطلاحية' },
      before: "Don't worry about the test — it's a piece of ",
      after: '.',
      options: ['bread', 'cake', 'pie', 'sugar'],
      correctIndex: 1,
      ruleTitle: { en: 'a piece of cake = very easy', ar: 'a piece of cake = سهل جدًا' },
      explanation: {
        en: "'A piece of cake' is a fixed idiom meaning something very easy.",
        ar: "'A piece of cake' تعبير ثابت يعني شيئًا سهلًا جدًا.",
      },
    },
    {
      id: 'v4',
      topic: { en: 'Word stress', ar: 'نبر الكلمة' },
      before: "Which word is stressed on the second syllable? → ",
      after: '',
      options: ['TAble', 'phoTOgraphy', 'HAPpy', 'STUdent'],
      correctIndex: 1,
      ruleTitle: { en: 'Stress in -graphy words', ar: 'النبر في الكلمات المنتهية بـ -graphy' },
      explanation: {
        en: "Words ending in -graphy are stressed on the syllable before it: pho-TO-gra-phy.",
        ar: "الكلمات المنتهية بـ -graphy يقع النبر فيها على المقطع السابق لها: pho-TO-gra-phy.",
      },
    },
  ],
};
