import { PaymentSettings, Purchase } from '../models/commerce';
import { ChatMessage, LiveClass } from '../models/live';

/** Placeholder until the backend + Mux are connected. Times are Cairo (UTC+2 in Nov). */
export const LIVE_CLASSES_MOCK: LiveClass[] = [
  {
    id: 'advanced-grammar',
    title: { en: 'Advanced Grammar: Conditionals & Inversions', ar: 'قواعد متقدمة: الجمل الشرطية والتقديم' },
    description: {
      en: 'Zero to third conditionals, mixed conditionals and inversion (“Had I known…”) with past Thanawya Amma questions.',
      ar: 'من الشرطية الصفرية إلى الثالثة، والشرطية المختلطة، والتقديم (“Had I known…”) مع أسئلة امتحانات الثانوية العامة السابقة.',
    },
    stage: 'sec3',
    startsAt: '2026-11-05T17:00:00Z',
    durationMin: 120,
    status: 'scheduled',
    access: { type: 'paid', priceEgp: 350 },
    seatsTaken: 312,
    maxSeats: 400,
  },
  {
    id: 'reading-inference',
    title: { en: 'Reading Skills: Inference Questions', ar: 'مهارات القراءة: أسئلة الاستنتاج' },
    description: {
      en: 'How to answer “What can be inferred…” questions quickly and accurately.',
      ar: 'كيف تجيب عن أسئلة “ماذا يمكن أن نستنتج…” بسرعة ودقة.',
    },
    stage: 'sec2',
    startsAt: '2026-10-22T17:00:00Z',
    durationMin: 120,
    status: 'live',
    access: { type: 'paid', priceEgp: 350 },
    seatsTaken: 296,
    maxSeats: 400,
    viewers: 286,
    playbackUrl: undefined,
  },
  {
    id: 'phrasal-verbs',
    title: { en: 'Phrasal Verbs Workshop', ar: 'ورشة الأفعال المركبة' },
    description: {
      en: 'The 40 phrasal verbs that appear most in Secondary exams, with practice.',
      ar: 'أكثر 40 فعلًا مركبًا تكرارًا في امتحانات الثانوي، مع تدريبات.',
    },
    stage: 'sec1',
    startsAt: '2026-10-20T17:00:00Z',
    durationMin: 118,
    status: 'ended',
    access: { type: 'included' },
    seatsTaken: 188,
    maxSeats: 400,
    replayUntil: '2026-11-19T22:00:00Z',
    stats: { durationMin: 118, attended: 188, questions: 146 },
  },
  {
    id: 'exam-night',
    title: { en: 'Exam Night: Full Mock Review', ar: 'ليلة الامتحان: مراجعة امتحان تجريبي كامل' },
    description: {
      en: 'A full mock exam solved live, section by section, with timing strategy.',
      ar: 'حل امتحان تجريبي كامل على الهواء، جزءًا جزءًا، مع استراتيجية إدارة الوقت.',
    },
    stage: 'sec3',
    startsAt: '2026-11-12T18:00:00Z',
    durationMin: 150,
    status: 'scheduled',
    access: { type: 'paid', priceEgp: 350 },
    seatsTaken: 41,
    maxSeats: 400,
  },
];

export const CHAT_MOCK: ChatMessage[] = [
  { id: 'm1', author: 'Mr. Adel Mostafa', initials: 'AM', teacher: true, pinned: true, at: '2026-10-22T17:58:00Z',
    text: 'Remember: inference = what the text suggests, not what it says directly.' },
  { id: 'm2', author: 'Nour Saeed', initials: 'NS', at: '2026-10-22T18:01:00Z', text: 'So the answer can’t be copied word for word?' },
  { id: 'm3', author: 'Youssef Hany', initials: 'YH', at: '2026-10-22T18:02:00Z', text: 'Is “implies” the same as “infer” in the question?' },
  { id: 'm4', author: 'Mariam Ali', initials: 'MA', at: '2026-10-22T18:02:00Z', text: 'Paragraph 2 suggests the writer disagrees 👀' },
];

export const PAYMENT_SETTINGS_MOCK: PaymentSettings = {
  providerConnected: false,
  providerName: null,
  manualEnabled: true,
  instapayAddress: 'adelmostafa@instapay',
  vodafoneNumber: '010 2345 6789',
  seatHoldMinutes: 15,
  defaultLivePriceEgp: 350,
};

/** What the demo student already owns — lets the "already enrolled" notice be seen. */
export const PURCHASES_MOCK: Purchase[] = [
  { kind: 'live', itemId: 'advanced-grammar', amountEgp: 350, method: 'Visa •••• 4242', reference: 'ME-2026-10-03977', paidAt: '2026-10-20T16:12:00Z' },
  { kind: 'live', itemId: 'reading-inference', amountEgp: 350, method: 'InstaPay', reference: 'ME-2026-10-04102', paidAt: '2026-10-21T19:41:00Z' },
];
