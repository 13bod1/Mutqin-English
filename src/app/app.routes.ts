import { Routes } from '@angular/router';
import { staffGuard } from './core/auth/staff.guard';
import { ShellComponent } from './shared/layout/shell.component';

export const routes: Routes = [
  {
    // Admin panel: same app, lazy-loaded, own layout. Real protection is Supabase RLS on profiles.role.
    path: 'admin',
    canMatch: [staffGuard],
    loadComponent: () => import('./features/admin/admin-shell.component').then((m) => m.AdminShellComponent),
    children: [
      { path: '', title: 'titles.admin.dashboard', loadComponent: () => import('./features/admin/dashboard.page').then((m) => m.AdminDashboardPage) },
      { path: 'users', title: 'titles.admin.users', loadComponent: () => import('./features/admin/users.page').then((m) => m.AdminUsersPage) },
      { path: 'lectures', title: 'titles.admin.lectures', loadComponent: () => import('./features/admin/lectures.page').then((m) => m.AdminLecturesPage) },
      { path: 'live', title: 'titles.admin.live', loadComponent: () => import('./features/admin/live.page').then((m) => m.AdminLivePage) },
      { path: 'payments', title: 'titles.admin.payments', loadComponent: () => import('./features/admin/payments.page').then((m) => m.AdminPaymentsPage) },
      { path: 'announcements', title: 'titles.admin.announcements', loadComponent: () => import('./features/admin/announcements.page').then((m) => m.AdminAnnouncementsPage) },
      { path: 'metrics', title: 'titles.admin.metrics', loadComponent: () => import('./features/admin/metrics.page').then((m) => m.AdminMetricsPage) },
      { path: 'settings', title: 'titles.admin.settings', loadComponent: () => import('./features/admin/settings.page').then((m) => m.AdminSettingsPage) },
    ],
  },
  {
    path: 'assistant',
    title: 'titles.assistant',
    canMatch: [staffGuard],
    loadComponent: () => import('./features/assistant/assistant.page').then((m) => m.AssistantPage),
  },
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
        path: 'announcements',
        title: 'titles.announcements',
        loadComponent: () => import('./features/announcements/announcements.page').then((m) => m.AnnouncementsPage),
      },
      {
        path: 'live',
        title: 'titles.live',
        loadComponent: () => import('./features/live/live-list.page').then((m) => m.LiveListPage),
      },
      {
        path: 'live/:id/studio',
        title: 'titles.studio',
        canMatch: [staffGuard],
        loadComponent: () => import('./features/live/live-studio.page').then((m) => m.LiveStudioPage),
      },
      {
        path: 'live/:id',
        title: 'titles.live',
        loadComponent: () => import('./features/live/live-session.page').then((m) => m.LiveSessionPage),
      },
      {
        path: 'checkout/result',
        title: 'titles.checkout',
        loadComponent: () => import('./features/checkout/payment-result.page').then((m) => m.PaymentResultPage),
      },
      {
        path: 'checkout/:kind/:id/manual',
        title: 'titles.checkout',
        loadComponent: () => import('./features/checkout/receipt-upload.page').then((m) => m.ReceiptUploadPage),
      },
      {
        path: 'checkout/:kind/:id',
        title: 'titles.checkout',
        loadComponent: () => import('./features/checkout/checkout.page').then((m) => m.CheckoutPage),
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
