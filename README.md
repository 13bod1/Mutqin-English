# Mutqin English — Frontend

Angular frontend for **Mutqin English**, an English-learning platform for Egyptian and Arab students.
Built from the "Mutqin English" Figma design. The app is bilingual (English / Arabic with full RTL) and responsive from 360px phones up to desktop.

## Run it

```bash
npm install
npm start          # http://localhost:4200
npm run build      # production build in dist/
```

Requires Node 20+.

## Pages

| Route        | Page                 | Notes                                                                   |
| ------------ | -------------------- | ----------------------------------------------------------------------- |
| `/`          | Landing              | Hero, features, instructor, testimonials, CTA                           |
| `/login`     | Log in               | Validation + error banner (mock: password `wrongpass` fails)            |
| `/signup`    | Sign up              | Stage chips, strong-password rule, confirm match, terms                 |
| `/lectures`  | Recorded Lectures    | Search, stage/topic/duration filters, sort, load more, player preview   |
| `/quizzes`   | Quizzes & Exercises  | Working quiz: answer, navigate, submit, graded review with explanations |
| `/progress`  | Progress dashboard   | Stats, weekly bar chart, skills, leaderboard, badges                    |

The "Flexible Learning" page from the design is intentionally not built yet.

## Project structure

```
src/app/
  core/
    i18n/      LanguageService (EN/AR, <html dir>), `t` and `loc` pipes, dictionaries, translated page titles
    models/    Typed interfaces for everything the backend will return
    data/      Data services (ContentService, LectureService, QuizService, ProgressService, AuthService)
    mock/      PLACEHOLDER data used by the services until the backend is ready
    icons.ts   Registered Lucide icons
  shared/
    layout/    Shell, Header, Footer (one shared header/footer for all pages)
    ui/        Logo, Media (image or placeholder), Avatar, SectionHeader, CtaBanner, ProgressRing, GoogleIcon
  features/    One folder per page (lazy-loaded routes)
```

## Connecting the backend

Every data service returns an `Observable` from `mockResponse(...)`. Each method is commented with the endpoint it stands in for, for example:

```ts
/** GET /api/lectures */
getLectures(): Observable<Lecture[]> {
  return mockResponse(LECTURES_MOCK);              // today
  // return this.http.get<Lecture[]>('/api/lectures'); // later
}
```

To connect a service: add `provideHttpClient()` in `app.config.ts`, swap `mockResponse(...)` for an `HttpClient` call, and delete the matching file in `core/mock/`. Components don't change, because they already handle async data with loading skeletons.

Backend text that appears in both languages uses the `LocalizedText` shape `{ en, ar }` and is shown with the `loc` pipe. Images (`photoUrl`, `thumbnailUrl`, `avatarUrl`) are optional: when they're missing, a branded placeholder is shown.

## Languages and RTL

- UI copy lives in `core/i18n/i18n.en.ts` and `i18n.ar.ts`. The Arabic file is type-checked against the English one, so a missing key fails the build.
- Switching language updates `<html lang dir>`, the font stack, and the tab title. The choice is remembered in `localStorage`.
- Layout uses logical spacing (`ms-*`, `pe-*`, `start-*`, `text-start`), so it mirrors automatically. Directional icons use the `flip-rtl` class.
- Fonts are self-hosted via `@fontsource`:
  - **English:** Plus Jakarta Sans (headings) and Inter (body)
  - **Arabic:** Alexandria (headings) and IBM Plex Sans Arabic (body)

## Design tokens

Colors, radii and shadows from the Figma file are defined in `tailwind.config.js`. Shared component classes (`btn`, `card`, `pill`, `chip`, `input`, …) are defined in `src/styles.scss`.
