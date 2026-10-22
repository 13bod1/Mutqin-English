import { Injectable } from '@angular/core';

interface LectureNotes {
  title: string;
  subtitle: string;
  topics: NoteSection[];
}

interface NoteSection {
  heading: string;
  items: string[];
  table?: { headers: string[]; rows: string[][] };
  tip?: string;
}

/** Pre-built study notes keyed by lecture ID */
const NOTES_MAP: Record<string, LectureNotes> = {
  l1: {
    title: 'Vocabulary Demystified: Advanced Collocations',
    subtitle: 'Unit 1 · Make or Do & Collocations · Mr. Adel Mostafa',
    topics: [
      {
        heading: 'Rule: MAKE vs DO',
        items: [
          'MAKE → creation / production: make a mistake, make a decision, make an effort',
          'DO → action / activity: do homework, do business, do damage',
          'Tip: If it produces something → MAKE. If it is an activity/task → DO.',
        ],
        table: {
          headers: ['MAKE collocations', 'DO collocations'],
          rows: [
            ['make a plan', 'do research'],
            ['make progress', 'do your best'],
            ['make an excuse', 'do harm'],
            ['make friends', 'do a favour'],
            ['make an impression', 'do the dishes'],
          ],
        },
        tip: 'Exam trap: "do a mistake" is WRONG → always "make a mistake".',
      },
      {
        heading: 'Common Exam Collocations',
        items: [
          'make a speech / make a suggestion / make a fortune',
          'do justice / do wonders / do the trick',
          'Fixed phrases must be memorised — no rule applies here.',
        ],
      },
      {
        heading: 'Practice Sentences',
        items: [
          'The student _____ great progress this term. (made)',
          'Can you _____ me a favour? (do)',
          'She _____ a terrible mistake. (made)',
          'He always _____ his homework on time. (does)',
        ],
      },
    ],
  },
  l2: {
    title: 'The Elusive Schwa /ə/ and Stress Patterns',
    subtitle: 'Phonetics & Accent Polish · Mr. Adel Mostafa',
    topics: [
      {
        heading: 'What is the Schwa /ə/?',
        items: [
          "The schwa is the most common vowel sound in English.",
          "It is a SHORT, UNSTRESSED, NEUTRAL sound — like 'uh'.",
          "It occurs in UNSTRESSED syllables only.",
          "Examples: about /əˈbaʊt/, teacher /ˈtiːtʃər/, the /ðə/",
        ],
        tip: 'Arabic has no schwa equivalent — this is why Arabic speakers tend to pronounce every syllable with full weight.',
      },
      {
        heading: 'Word Stress Rules',
        items: [
          '2-syllable nouns/adjectives → stress on 1st syllable: TAble, HAppy',
          '2-syllable verbs → stress on 2nd syllable: reLAX, deCIDE',
          '-tion / -sion endings → stress on syllable before: inforMAtion, disCUSsion',
          '-ic endings → stress on syllable before: elecTRIc, acaDEmic',
        ],
        table: {
          headers: ['Word', 'Stressed syllable', 'Schwa position'],
          rows: [
            ['about', '2nd (bout)', '1st syllable: /ə/'],
            ['banana', '2nd (na)', '1st and 3rd: /ə/'],
            ['teacher', '1st (tea)', '2nd syllable: /ər/'],
            ['information', '3rd (ma)', '1st syllable: /ə/'],
          ],
        },
      },
    ],
  },
  l3: {
    title: 'Reported Speech: Statements, Questions & Commands',
    subtitle: 'Unit 6 · Reported Speech · Mr. Adel Mostafa',
    topics: [
      {
        heading: 'Backshift Tense Rules',
        items: [
          'Present Simple → Past Simple: "I work" → He said he worked',
          'Present Continuous → Past Continuous: "I am working" → She said she was working',
          'Present Perfect → Past Perfect: "I have finished" → He said he had finished',
          'Past Simple → Past Perfect: "I went" → She said she had gone',
          'Will → Would: "I will come" → He said he would come',
          'Can → Could / May → Might / Must → Had to',
        ],
        tip: 'No backshift needed if reporting verb is present: "He says he works hard."',
      },
      {
        heading: 'Reported Questions',
        items: [
          'YES/NO questions → use if/whether: "Are you ready?" → He asked if I was ready.',
          'WH- questions → use the WH- word: "Where do you live?" → She asked where I lived.',
          'Remove the auxiliary DO/DOES/DID in indirect questions.',
          'Change question word order to STATEMENT order (subject before verb).',
        ],
        table: {
          headers: ['Direct', 'Reported'],
          rows: [
            ['"What is your name?"', 'He asked what my name was.'],
            ['"Are you Egyptian?"', 'She asked if I was Egyptian.'],
            ['"Where did you go?"', 'He asked where I had gone.'],
          ],
        },
      },
      {
        heading: 'Reported Commands & Requests',
        items: [
          'Commands → told + object + to-infinitive: "Sit down!" → He told me to sit down.',
          'Negative commands → told + object + not to-infinitive: "Don\'t shout" → She told him not to shout.',
          'Requests → asked + object + to-infinitive: "Please help me" → She asked me to help her.',
        ],
      },
    ],
  },
};

/** Fallback generic notes for any lecture not in NOTES_MAP */
function buildGenericNotes(title: string, subtitle: string): LectureNotes {
  return {
    title,
    subtitle: subtitle + ' · Mr. Adel Mostafa',
    topics: [
      {
        heading: 'Key Concepts',
        items: [
          'Review the core vocabulary introduced in this lecture.',
          'Practice applying grammar rules in context.',
          'Focus on Egyptian exam-style questions.',
        ],
        tip: 'Complete the accompanying quiz to reinforce your understanding.',
      },
      {
        heading: 'Study Tips',
        items: [
          'Watch the lecture at least twice — first for overview, then for detail.',
          'Pause and repeat aloud to improve pronunciation and retention.',
          'Write your own example sentences using the new grammar patterns.',
          'Compare your sentences with native-English examples in your textbook.',
        ],
      },
      {
        heading: 'Self-Assessment Questions',
        items: [
          'Can I explain the main rule in my own words?',
          'Can I generate 3 original examples without looking at my notes?',
          'Which part do I still find difficult? → Revisit that section.',
        ],
      },
    ],
  };
}

@Injectable({ providedIn: 'root' })
export class PdfNotesService {

  /** Build and download a PDF for a given lecture */
  downloadNotes(lectureId: string, lectureTitle: string, lectureUnit: string): void {
    const notes = NOTES_MAP[lectureId] ?? buildGenericNotes(lectureTitle, lectureUnit);
    const html = this.buildHtml(notes);
    this.triggerPrint(html, notes.title);
  }

  private buildHtml(notes: LectureNotes): string {
    const sectionsHtml = notes.topics.map(section => `
      <div class="section">
        <h2>${section.heading}</h2>
        <ul>
          ${section.items.map(item => `<li>${item}</li>`).join('')}
        </ul>
        ${section.table ? `
          <table>
            <thead><tr>${section.table.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>
              ${section.table.rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
            </tbody>
          </table>
        ` : ''}
        ${section.tip ? `<div class="tip"><strong>💡 Exam Tip:</strong> ${section.tip}</div>` : ''}
      </div>
    `).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${notes.title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 40px; font-size: 13px; line-height: 1.7; }
  .header { border-bottom: 3px solid #2563eb; padding-bottom: 18px; margin-bottom: 30px; }
  .logo-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
  .logo-badge { background: #2563eb; color: white; font-size: 18px; font-weight: 900; padding: 6px 14px; border-radius: 8px; letter-spacing: 1px; }
  .logo-sub { color: #64748b; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
  h1 { font-size: 22px; font-weight: 800; color: #1e3a5f; margin-bottom: 4px; }
  .subtitle { color: #64748b; font-size: 11px; font-weight: 600; letter-spacing: 0.3px; }
  .meta-row { display: flex; gap: 16px; margin-top: 10px; }
  .meta-badge { background: #eff6ff; color: #2563eb; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; border: 1px solid #bfdbfe; }
  .section { margin-bottom: 28px; page-break-inside: avoid; }
  h2 { font-size: 14px; font-weight: 800; color: #2563eb; background: #eff6ff; border-left: 4px solid #2563eb; padding: 8px 12px; border-radius: 0 6px 6px 0; margin-bottom: 12px; }
  ul { padding-left: 20px; margin-bottom: 12px; }
  li { margin-bottom: 5px; color: #374151; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
  th { background: #2563eb; color: white; padding: 8px 12px; text-align: left; font-weight: 700; }
  td { padding: 7px 12px; border-bottom: 1px solid #e5e7eb; }
  tr:nth-child(even) td { background: #f8fafc; }
  .tip { background: #fefce8; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; padding: 10px 14px; border-radius: 0 8px 8px 0; color: #78350f; margin-top: 10px; font-size: 12px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; color: #9ca3af; font-size: 10px; }
  @media print { body { padding: 20px; } .section { page-break-inside: avoid; } }
</style>
</head>
<body>
  <div class="header">
    <div class="logo-row">
      <div class="logo-badge">MR. ADEL</div>
      <div class="logo-sub">مستر عادل مصطفى · Study Notes</div>
    </div>
    <h1>${notes.title}</h1>
    <p class="subtitle">${notes.subtitle}</p>
    <div class="meta-row">
      <span class="meta-badge">📚 Study Notes</span>
      <span class="meta-badge">🎓 Mr. Adel Mostafa</span>
      <span class="meta-badge">📅 ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
    </div>
  </div>

  ${sectionsHtml}

  <div class="footer">
    <span>© Mr. Adel Mostafa · mutqin-english-amber.vercel.app</span>
    <span>Generated: ${new Date().toLocaleString('en-GB')}</span>
  </div>
</body>
</html>`;
  }

  private triggerPrint(html: string, title: string): void {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      // Fallback: download as HTML blob if popup blocked
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_notes.html`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    win.document.write(html);
    win.document.close();
    // Give browser time to render, then trigger print dialog (Save as PDF)
    setTimeout(() => {
      win.focus();
      win.print();
    }, 600);
  }
}
