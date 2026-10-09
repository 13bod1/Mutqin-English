import { Routes } from '@angular/router';
import { ShellComponent } from './shared/layout/shell.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      {
        path: '',
        title: 'titles.home',
        loadComponent: () => import('./features/landing/landing.page').then((m) => m.LandingPage),
      },
      {
        path: 'login',
        title: 'titles.login',
        loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage),
      },
      {
        path: 'signup',
        title: 'titles.signup',
        loadComponent: () => import('./features/auth/signup.page').then((m) => m.SignupPage),
      },
      {
        path: 'lectures',
        title: 'titles.lectures',
        loadComponent: () => import('./features/lectures/lectures.page').then((m) => m.LecturesPage),
      },
      {
        path: 'quizzes',
        title: 'titles.quizzes',
        loadComponent: () => import('./features/quizzes/quizzes.page').then((m) => m.QuizzesPage),
      },
      {
        path: 'progress',
        title: 'titles.progress',
        loadComponent: () => import('./features/progress/progress.page').then((m) => m.ProgressPage),
      },
      {
        path: '**',
        title: 'titles.notFound',
        loadComponent: () => import('./features/not-found.page').then((m) => m.NotFoundPage),
      },
    ],
  },
];
