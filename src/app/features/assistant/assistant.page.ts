import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AdminService } from '../../core/data/admin.service';
import { AuthService } from '../../core/data/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { LocalizePipe, TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminPayment, AdminStudent } from '../../core/models/admin';
import { LiveClass } from '../../core/models/live';

type AssistantTab = 'receipts' | 'attendance' | 'qa' | 'boundaries';

interface StudentQuestion {
  id: string;
  student: string;
  stage: string;
  topic: string;
  question: string;
  createdAt: string;
  status: 'pending' | 'answered';
  answer?: string;
  answeredBy?: string;
}

@Component({
  selector: 'app-assistant-page',
  imports: [RouterLink, FormsModule, LucideAngularModule, TranslatePipe, LocalizePipe, DatePipe],
  template: `
    <div class="min-h-dvh bg-surface-page pb-16">
      <!-- Top Bar -->
      <header class="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line/60 bg-white/95 px-4 backdrop-blur md:h-[72px] md:px-8">
        <div class="flex items-center gap-3">
          <span class="grid h-10 w-10 place-items-center rounded-xl bg-primary text-white shadow-xs">
            <lucide-icon name="user-check" [size]="20" />
          </span>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-display text-base font-bold text-ink">{{ 'brand.name' | t }}</span>
              <span class="rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[0.6875rem] font-bold text-amber-900">
                {{ i18n.lang() === 'ar' ? 'بوابة المساعد (صلاحيات محدودة)' : 'Assistant Portal (Limited)' }}
              </span>
            </div>
            <p class="text-xs text-ink-muted">
              {{ i18n.lang() === 'ar' ? 'مكتب العمليات التشغيلية ومراجعة الإيصالات' : 'Operations & Receipt Review Desk' }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2.5 sm:gap-3">
          <button type="button" (click)="i18n.toggle()" class="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-white px-3 text-xs font-semibold text-ink-body hover:text-ink">
            <lucide-icon name="languages" [size]="15" />
            <span>{{ 'nav.switchLang' | t }}</span>
          </button>

          <a routerLink="/" class="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-xs font-semibold text-ink-body hover:text-ink">
            <lucide-icon name="external-link" [size]="14" />
            <span class="hidden sm:inline">{{ 'admin.viewSite' | t }}</span>
          </a>

          @if (auth.user()?.role === 'admin') {
            <a routerLink="/admin" class="inline-flex h-9 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 text-xs font-bold text-primary hover:bg-primary hover:text-white">
              <lucide-icon name="shield-check" [size]="14" />
              <span>{{ 'admin.panel' | t }}</span>
            </a>
          }

          <div class="flex items-center gap-2 border-s border-line/60 ps-2.5">
            <div class="text-end hidden sm:block">
              <span class="block font-display text-xs font-bold text-ink">{{ auth.user()?.fullName || 'Teaching Assistant' }}</span>
              <span class="block text-[0.625rem] font-medium text-amber-700">{{ auth.user()?.email }}</span>
            </div>
            <button type="button" (click)="logout()" class="grid h-9 w-9 place-items-center rounded-lg border border-danger-line/60 text-danger hover:bg-danger-soft" [title]="'auth.logout' | t">
              <lucide-icon name="log-out" [size]="16" />
            </button>
          </div>
        </div>
      </header>

      <main class="container-page py-6 space-y-6">
        <!-- Notice Banner -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-card-lg border border-amber-200 bg-amber-50/80 p-4 shadow-xs">
          <div class="flex items-start gap-3">
            <lucide-icon name="shield-alert" [size]="20" class="shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p class="font-display text-sm font-bold text-amber-950">
                {{ i18n.lang() === 'ar' ? 'حساب مساعد المعلم · صلاحيات تشغيلية محددة' : 'Teaching Assistant Mode · Restricted Operations' }}
              </p>
              <p class="text-xs text-amber-800 mt-0.5">
                {{ i18n.lang() === 'ar'
                  ? 'يمكنك مراجعة إيصالات التحويل، تسجيل حضور الجلسات، والرد على أسئلة الطلاب. تعديل الأسعار، الإعدادات المالية، وحذف الحسابات مقتصرة حصرياً على الأستاذ عادل مصطفى.'
                  : 'You can verify student transfer receipts, mark live attendance, and answer student questions. Pricing, financial payouts, and user deletion are strictly reserved for Mr. Adel Mostafa.' }}
              </p>
            </div>
          </div>
          <span class="shrink-0 rounded-full bg-amber-200/80 px-3 py-1 font-display text-xs font-bold text-amber-950">
            {{ i18n.lang() === 'ar' ? 'صلاحيات مستوى: مساعد' : 'Role: Assistant' }}
          </span>
        </div>

        <!-- Quick Stats -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="card p-4 sm:p-5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-ink-muted">
                {{ i18n.lang() === 'ar' ? 'إيصالات بانتظار الفحص' : 'Receipts Awaiting Review' }}
              </span>
              <span class="grid h-8 w-8 place-items-center rounded-lg bg-amber-100 text-amber-700">
                <lucide-icon name="receipt" [size]="16" />
              </span>
            </div>
            <p class="mt-2 font-display text-2xl font-bold text-ink">{{ admin.pendingCount() }}</p>
            <p class="mt-1 text-xs text-amber-700 font-medium">
              {{ i18n.lang() === 'ar' ? 'تتضمن إيصالات إنستاباي واتصالات كاش' : 'Includes InstaPay & Etisalat Cash' }}
            </p>
          </div>

          <div class="card p-4 sm:p-5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-ink-muted">
                {{ i18n.lang() === 'ar' ? 'الجلسات المباشرة القادمة' : 'Upcoming Live Sessions' }}
              </span>
              <span class="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary">
                <lucide-icon name="radio" [size]="16" />
              </span>
            </div>
            <p class="mt-2 font-display text-2xl font-bold text-ink">{{ scheduledLive().length }}</p>
            <p class="mt-1 text-xs text-ink-muted">
              {{ i18n.lang() === 'ar' ? 'جاهزة لتسجيل الحضور' : 'Ready for attendance check' }}
            </p>
          </div>

          <div class="card p-4 sm:p-5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-ink-muted">
                {{ i18n.lang() === 'ar' ? 'أسئلة الطلاب المعلقة' : 'Pending Student Inquiries' }}
              </span>
              <span class="grid h-8 w-8 place-items-center rounded-lg bg-blue-100 text-blue-700">
                <lucide-icon name="message-circle" [size]="16" />
              </span>
            </div>
            <p class="mt-2 font-display text-2xl font-bold text-ink">{{ pendingQuestionsCount() }}</p>
            <p class="mt-1 text-xs text-blue-700 font-medium">
              {{ i18n.lang() === 'ar' ? 'استفسارات حول القواعد والمقالات' : 'Grammar & essay inquiries' }}
            </p>
          </div>

          <div class="card p-4 sm:p-5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-ink-muted">
                {{ i18n.lang() === 'ar' ? 'الطلاب النشطون' : 'Active Students' }}
              </span>
              <span class="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                <lucide-icon name="users" [size]="16" />
              </span>
            </div>
            <p class="mt-2 font-display text-2xl font-bold text-ink">{{ admin.students().length }}</p>
            <p class="mt-1 text-xs text-emerald-700 font-medium">
              {{ i18n.lang() === 'ar' ? 'مسجلون في المنصة' : 'Enrolled in platform' }}
            </p>
          </div>
        </div>

        <!-- Tab Bar -->
        <div class="seg" role="tablist">
          <button type="button" role="tab" [class.seg-on]="tab() === 'receipts'" (click)="tab.set('receipts')">
            <lucide-icon name="receipt" [size]="16" class="inline me-1.5" />
            {{ i18n.lang() === 'ar' ? 'مراجعة الإيصالات' : 'Receipts Review' }} ({{ admin.pendingCount() }})
          </button>
          <button type="button" role="tab" [class.seg-on]="tab() === 'attendance'" (click)="tab.set('attendance')">
            <lucide-icon name="clipboard-check" [size]="16" class="inline me-1.5" />
            {{ i18n.lang() === 'ar' ? 'حضور الجلسات' : 'Live Attendance' }}
          </button>
          <button type="button" role="tab" [class.seg-on]="tab() === 'qa'" (click)="tab.set('qa')">
            <lucide-icon name="messages-square" [size]="16" class="inline me-1.5" />
            {{ i18n.lang() === 'ar' ? 'استفسارات الطلاب' : 'Student Q&A' }} ({{ pendingQuestionsCount() }})
          </button>
          <button type="button" role="tab" [class.seg-on]="tab() === 'boundaries'" (click)="tab.set('boundaries')">
            <lucide-icon name="shield-ban" [size]="16" class="inline me-1.5" />
            {{ i18n.lang() === 'ar' ? 'حدود الصلاحيات' : 'Permission Boundaries' }}
          </button>
        </div>

        <!-- TAB 1: RECEIPTS REVIEW -->
        @if (tab() === 'receipts') {
          <div class="card p-5 sm:p-6 space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 class="font-display text-lg font-bold text-ink">
                  {{ i18n.lang() === 'ar' ? 'إيصالات التحويل قيد الفحص والتحقق' : 'Transfer Receipts Under Review' }}
                </h2>
                <p class="text-xs text-ink-muted">
                  {{ i18n.lang() === 'ar'
                    ? 'افحص لقطات الشاشة الحقيقية المرفقة من الطلاب (إنستاباي / اتصالات كاش) وتأكد من مطابقة المبلغ والاسم'
                    : 'Inspect uploaded student screenshots (InstaPay / Etisalat Cash) and verify amount and sender name' }}
                </p>
              </div>

              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-ink-muted">
                  {{ i18n.lang() === 'ar' ? 'المعاملات المعلقة:' : 'Pending:' }}
                </span>
                <span class="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                  {{ pendingPayments().length }}
                </span>
              </div>
            </div>

            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>{{ 'admin.cols.studentItem' | t }}</th>
                    <th>{{ 'admin.cols.method' | t }}</th>
                    <th>{{ 'admin.cols.amount' | t }}</th>
                    <th>{{ i18n.lang() === 'ar' ? 'لقطة الإيصال الحقيقية' : 'Uploaded Screenshot' }}</th>
                    <th>{{ 'admin.cols.submitted' | t }}</th>
                    <th>{{ 'admin.cols.status' | t }}</th>
                    <th>{{ i18n.lang() === 'ar' ? 'إجراء المساعد' : 'Assistant Action' }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of pendingPayments(); track p.id) {
                    <tr>
                      <td>
                        <div class="flex items-center gap-2.5">
                          <span class="grid h-8 w-8 place-items-center rounded-full bg-primary/10 font-display text-xs font-bold text-primary">
                            {{ p.initials }}
                          </span>
                          <div>
                            <p class="font-display font-semibold text-ink text-sm">{{ p.student }}</p>
                            <p class="text-xs text-ink-muted">{{ p.email }}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span class="tag tone-brand whitespace-nowrap">
                          {{ p.method === 'instapay' ? 'InstaPay' : p.method === 'etisalat' ? 'Etisalat Cash' : ('pay.manual.' + p.method | t) }}
                        </span>
                      </td>
                      <td class="font-display font-bold text-ink whitespace-nowrap">
                        {{ p.amountEgp }} EGP
                      </td>
                      <td>
                        @if (p.receiptFile) {
                          <button type="button" (click)="openImageModal(p.receiptFile, p.student)"
                            class="group flex items-center gap-2 rounded-lg border border-line bg-surface-warm/70 p-1.5 transition hover:border-primary/50 hover:bg-surface-tint">
                            <img [src]="p.receiptFile" [alt]="p.student" class="h-10 w-10 rounded object-cover shadow-2xs group-hover:scale-105 transition" />
                            <div class="text-start pe-2">
                              <span class="block text-[0.6875rem] font-bold text-primary group-hover:underline">
                                {{ i18n.lang() === 'ar' ? 'عرض المكبر' : 'View Zoom' }}
                              </span>
                              <span class="block text-[0.625rem] text-ink-muted">
                                {{ p.reference }}
                              </span>
                            </div>
                          </button>
                        } @else {
                          <span class="text-xs text-ink-muted">—</span>
                        }
                      </td>
                      <td class="whitespace-nowrap text-xs text-ink-muted">
                        {{ p.submittedAt | date: 'd MMM, h:mm a' }}
                      </td>
                      <td>
                        <span class="tag tone-warning">
                          {{ 'admin.pay.status.' + p.status | t }}
                        </span>
                      </td>
                      <td>
                        <div class="flex items-center gap-1.5">
                          <button type="button" (click)="approvePayment(p.id)" class="btn btn-success-soft btn-sm" [title]="i18n.lang() === 'ar' ? 'تأكيد صحة الإيصال' : 'Verify receipt'">
                            <lucide-icon name="check" [size]="14" class="me-1" />
                            {{ i18n.lang() === 'ar' ? 'تأكيد' : 'Verify' }}
                          </button>
                          <button type="button" (click)="rejectPayment(p)" class="btn btn-danger-soft btn-sm" [title]="i18n.lang() === 'ar' ? 'رفض الإيصال' : 'Reject receipt'">
                            <lucide-icon name="x" [size]="14" class="me-1" />
                            {{ i18n.lang() === 'ar' ? 'رفض' : 'Reject' }}
                          </button>
                          <button type="button" (click)="flagPayment(p)" class="btn btn-soft btn-sm text-amber-700" [title]="i18n.lang() === 'ar' ? 'إبلاغ المعلم' : 'Flag note'">
                            <lucide-icon name="flag" [size]="14" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="7" class="py-12 text-center text-ink-muted">
                        <lucide-icon name="check-check" [size]="32" class="mx-auto text-success" />
                        <p class="mt-2 font-display font-semibold text-ink">
                          {{ i18n.lang() === 'ar' ? 'تم فحص جميع الإيصالات بنجاح' : 'All receipts have been reviewed' }}
                        </p>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- TAB 2: LIVE ATTENDANCE -->
        @if (tab() === 'attendance') {
          <div class="card p-5 sm:p-6 space-y-6">
            <div>
              <h2 class="font-display text-lg font-bold text-ink">
                {{ i18n.lang() === 'ar' ? 'تسجيل حضور الطلاب في الجلسات المباشرة' : 'Live Session Student Attendance' }}
              </h2>
              <p class="text-xs text-ink-muted">
                {{ i18n.lang() === 'ar'
                  ? 'اختر الجلسة لتسجيل حضور الطلاب ومتابعة التزامهم أثناء البث'
                  : 'Select session to record attendance and monitor student participation during live streams' }}
              </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              @for (cls of scheduledLive(); track cls.id) {
                <div class="rounded-card-lg border p-4 transition"
                  [class]="selectedClassId() === cls.id ? 'border-primary bg-surface-tint shadow-sm' : 'border-line bg-white hover:border-primary/40'">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <span class="chip"><lucide-icon name="radio" [size]="12" class="me-1 text-red-600" />{{ 'stagesShort.' + cls.stage | t }}</span>
                      <h3 class="font-display font-bold text-base text-ink mt-2">{{ cls.title | loc }}</h3>
                      <p class="text-xs text-ink-muted mt-1">
                        {{ cls.startsAt | date: 'EEEE, d MMM · h:mm a' }}
                      </p>
                    </div>
                    <button type="button" (click)="selectedClassId.set(cls.id)"
                      class="btn btn-sm" [class]="selectedClassId() === cls.id ? 'btn-primary' : 'btn-soft'">
                      {{ selectedClassId() === cls.id ? (i18n.lang() === 'ar' ? 'قائمة الحضور' : 'Selected') : (i18n.lang() === 'ar' ? 'عرض الحضور' : 'Open Roster') }}
                    </button>
                  </div>

                  <div class="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-xs text-ink-muted">
                    <span>{{ cls.seatsTaken }} / {{ cls.maxSeats }} {{ i18n.lang() === 'ar' ? 'طالب مسجل' : 'students enrolled' }}</span>
                    <span class="font-semibold text-primary">{{ cls.durationMin }} {{ 'common.minutes' | t: { n: cls.durationMin } }}</span>
                  </div>
                </div>
              }
            </div>

            <!-- Attendance Table for Selected Session -->
            @if (activeClass(); as cls) {
              <div class="mt-6 pt-6 border-t border-line space-y-4">
                <div class="flex items-center justify-between">
                  <h3 class="font-display text-base font-bold text-ink">
                    {{ i18n.lang() === 'ar' ? 'قائمة طلاب: ' : 'Student Roster: ' }} {{ cls.title | loc }}
                  </h3>
                  <span class="tag tone-brand">{{ studentsInStage(cls.stage).length }} {{ i18n.lang() === 'ar' ? 'طالب في هذه المرحلة' : 'students in stage' }}</span>
                </div>

                <div class="table-wrap">
                  <table class="table">
                    <thead>
                      <tr>
                        <th>{{ 'admin.cols.student' | t }}</th>
                        <th>{{ 'admin.cols.stage' | t }}</th>
                        <th>{{ i18n.lang() === 'ar' ? 'حالة الحضور' : 'Attendance' }}</th>
                        <th>{{ i18n.lang() === 'ar' ? 'إجراء' : 'Mark' }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (s of studentsInStage(cls.stage); track s.id) {
                        <tr>
                          <td>
                            <div class="flex items-center gap-2.5">
                              <span class="grid h-8 w-8 place-items-center rounded-full bg-primary font-display text-xs font-bold text-white">
                                {{ getInitials(s.name) }}
                              </span>
                              <div>
                                <p class="font-display font-semibold text-ink text-sm">{{ s.name }}</p>
                                <p class="text-xs text-ink-muted">{{ s.email }}</p>
                              </div>
                            </div>
                          </td>
                          <td><span class="tag tone-brand">{{ 'stagesShort.' + s.stage | t }}</span></td>
                          <td>
                            <span class="tag" [class]="attendanceMap()[cls.id + '_' + s.id] ? 'tone-success' : 'tone-neutral'">
                              {{ attendanceMap()[cls.id + '_' + s.id] ? (i18n.lang() === 'ar' ? 'حاضر ✅' : 'Present ✅') : (i18n.lang() === 'ar' ? 'لم يسجل بعد' : 'Not marked') }}
                            </span>
                          </td>
                          <td>
                            <button type="button" (click)="toggleAttendance(cls.id, s.id)"
                              class="btn btn-sm" [class]="attendanceMap()[cls.id + '_' + s.id] ? 'btn-soft text-danger' : 'btn-primary'">
                              {{ attendanceMap()[cls.id + '_' + s.id] ? (i18n.lang() === 'ar' ? 'إلغاء الحضور' : 'Unmark') : (i18n.lang() === 'ar' ? 'تسجيل حضور' : 'Mark Present') }}
                            </button>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }
          </div>
        }

        <!-- TAB 3: STUDENT Q&A -->
        @if (tab() === 'qa') {
          <div class="card p-5 sm:p-6 space-y-4">
            <div>
              <h2 class="font-display text-lg font-bold text-ink">
                {{ i18n.lang() === 'ar' ? 'مكتب مساعدة استفسارات وأسئلة الطلاب' : 'Student Question & Help Desk' }}
              </h2>
              <p class="text-xs text-ink-muted">
                {{ i18n.lang() === 'ar'
                  ? 'مساعدة الطلاب في استفسارات القواعد اللغوية وكتابة المقالات ومتابعة التمارين'
                  : 'Assist students with grammar questions, essay reviews, and practice questions' }}
              </p>
            </div>

            <div class="space-y-4">
              @for (q of questions(); track q.id) {
                <div class="rounded-card-lg border border-line bg-white p-4 shadow-2xs space-y-3">
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2">
                      <span class="grid h-7 w-7 place-items-center rounded-full bg-primary/10 font-display text-xs font-bold text-primary">
                        {{ getInitials(q.student) }}
                      </span>
                      <span class="font-display font-bold text-sm text-ink">{{ q.student }}</span>
                      <span class="tag tone-brand text-[0.6875rem]">{{ q.stage }}</span>
                      <span class="tag tone-neutral text-[0.6875rem]">{{ q.topic }}</span>
                    </div>
                    <span class="tag" [class]="q.status === 'answered' ? 'tone-success' : 'tone-warning'">
                      {{ q.status === 'answered' ? (i18n.lang() === 'ar' ? 'تم الرد' : 'Answered') : (i18n.lang() === 'ar' ? 'بانتظار الرد' : 'Pending') }}
                    </span>
                  </div>

                  <p class="text-sm text-ink-body bg-surface-page p-3 rounded-card border border-line/40">
                    "{{ q.question }}"
                  </p>

                  @if (q.answer) {
                    <div class="bg-emerald-50/70 border border-emerald-200 p-3 rounded-card text-xs text-emerald-950 space-y-1">
                      <p class="font-bold flex items-center gap-1.5">
                        <lucide-icon name="circle-check" [size]="14" class="text-emerald-600" />
                        {{ i18n.lang() === 'ar' ? 'إجابة المساعد:' : 'Assistant Answer:' }} ({{ q.answeredBy }})
                      </p>
                      <p class="text-emerald-900">{{ q.answer }}</p>
                    </div>
                  } @else {
                    <div class="flex gap-2">
                      <input type="text" [(ngModel)]="replyDrafts[q.id]" [placeholder]="i18n.lang() === 'ar' ? 'اكتب إجابة توضيحية للطالب...' : 'Type explanation for student...'"
                        class="input h-9 text-xs flex-1" />
                      <button type="button" (click)="sendAnswer(q.id)" class="btn btn-primary btn-sm">
                        <lucide-icon name="send" [size]="13" class="me-1 flip-rtl" />
                        {{ i18n.lang() === 'ar' ? 'إرسال الرد' : 'Send Answer' }}
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- TAB 4: PERMISSION BOUNDARIES -->
        @if (tab() === 'boundaries') {
          <div class="card p-5 sm:p-6 space-y-6">
            <div>
              <h2 class="font-display text-lg font-bold text-ink">
                {{ i18n.lang() === 'ar' ? 'مصفوفة حدود الصلاحيات والأمان (RBAC)' : 'Role & Permission Boundaries (RBAC)' }}
              </h2>
              <p class="text-xs text-ink-muted">
                {{ i18n.lang() === 'ar'
                  ? 'توزيع الصلاحيات بين إدارة الأستاذ عادل مصطفى وبين مكتب المساعدين'
                  : 'Separation of concerns between Administrator (Mr. Adel Mostafa) and Assistant Staff' }}
              </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- What assistant can do -->
              <div class="rounded-card-lg border border-emerald-200 bg-emerald-50/50 p-5 space-y-3">
                <div class="flex items-center gap-2 text-emerald-900 font-bold font-display text-sm">
                  <lucide-icon name="badge-check" [size]="18" class="text-emerald-600" />
                  {{ i18n.lang() === 'ar' ? 'صلاحيات المساعد المعتمدة (مسموح)' : 'Allowed Assistant Capabilities' }}
                </div>
                <ul class="space-y-2 text-xs text-emerald-950">
                  <li class="flex items-center gap-2">
                    <lucide-icon name="check" [size]="14" class="text-emerald-600 shrink-0" />
                    <span>{{ i18n.lang() === 'ar' ? 'مراجعة وتأكيد إيصالات الطلاب ومطابقة أرقام المرجع' : 'Review & verify student transfer receipts and references' }}</span>
                  </li>
                  <li class="flex items-center gap-2">
                    <lucide-icon name="check" [size]="14" class="text-emerald-600 shrink-0" />
                    <span>{{ i18n.lang() === 'ar' ? 'تسجيل حضور وغياب الطلاب في الجلسات المباشرة' : 'Record and manage student attendance in live sessions' }}</span>
                  </li>
                  <li class="flex items-center gap-2">
                    <lucide-icon name="check" [size]="14" class="text-emerald-600 shrink-0" />
                    <span>{{ i18n.lang() === 'ar' ? 'الرد على استفسارات الطلاب وأسئلة القواعد' : 'Reply to student inquiries and grammar practice questions' }}</span>
                  </li>
                  <li class="flex items-center gap-2">
                    <lucide-icon name="check" [size]="14" class="text-emerald-600 shrink-0" />
                    <span>{{ i18n.lang() === 'ar' ? 'عرض قائمة الطلاب والبيانات الأكاديمية' : 'View enrolled students list and academic stages' }}</span>
                  </li>
                </ul>
              </div>

              <!-- What assistant CANNOT do -->
              <div class="rounded-card-lg border border-danger-line bg-danger-soft/60 p-5 space-y-3">
                <div class="flex items-center gap-2 text-danger font-bold font-display text-sm">
                  <lucide-icon name="ban" [size]="18" class="text-danger shrink-0" />
                  {{ i18n.lang() === 'ar' ? 'قيود صارمة (خاص بالأستاذ عادل مصطفى فقط)' : 'Restricted (Admin / Mr. Adel Mostafa Only)' }}
                </div>
                <ul class="space-y-2 text-xs text-ink-body">
                  <li class="flex items-center gap-2 text-danger">
                    <lucide-icon name="x" [size]="14" class="shrink-0" />
                    <span>{{ i18n.lang() === 'ar' ? 'حظر الطلاب، تعليق الحسابات أو حذف المستخدمين' : 'Banning, suspending, or deleting student accounts' }}</span>
                  </li>
                  <li class="flex items-center gap-2 text-danger">
                    <lucide-icon name="x" [size]="14" class="shrink-0" />
                    <span>{{ i18n.lang() === 'ar' ? 'تعديل أسعار المحاضرات أو اشتراكات الجلسات المباشرة' : 'Modifying lecture fees or live session pricing' }}</span>
                  </li>
                  <li class="flex items-center gap-2 text-danger">
                    <lucide-icon name="x" [size]="14" class="shrink-0" />
                    <span>{{ i18n.lang() === 'ar' ? 'تعديل أرقام إنستاباي، فودافون كاش، أو اتصالات كاش' : 'Changing InstaPay, Vodafone, or Etisalat Cash numbers' }}</span>
                  </li>
                  <li class="flex items-center gap-2 text-danger">
                    <lucide-icon name="x" [size]="14" class="shrink-0" />
                    <span>{{ i18n.lang() === 'ar' ? 'الوصول لإعدادات النظام ومفاتيح الربط والسمات' : 'Accessing API keys, system settings, or site theme controls' }}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        }
      </main>

      <!-- Zoom Receipt Image Modal -->
      @if (zoomedImage()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" (click)="zoomedImage.set(null)">
          <div class="relative max-h-[90vh] max-w-xl rounded-2xl bg-white p-3 shadow-2xl" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between border-b pb-2 mb-2 px-2">
              <span class="font-display font-bold text-sm text-ink">
                {{ zoomedStudent() }} - {{ i18n.lang() === 'ar' ? 'لقطة التحويل' : 'Receipt Screenshot' }}
              </span>
              <button type="button" (click)="zoomedImage.set(null)" class="rounded-lg p-1 hover:bg-black/10 text-ink-muted">
                <lucide-icon name="x" [size]="18" />
              </button>
            </div>
            <img [src]="zoomedImage()" [alt]="zoomedStudent()" class="max-h-[75vh] w-auto mx-auto rounded-lg object-contain shadow-sm" />
          </div>
        </div>
      }
    </div>
  `,
})
export class AssistantPage {
  protected readonly admin = inject(AdminService);
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(LanguageService);
  private readonly router = inject(Router);

  protected readonly tab = signal<AssistantTab>('receipts');
  protected readonly selectedClassId = signal<string>('c1');
  protected readonly zoomedImage = signal<string | null>(null);
  protected readonly zoomedStudent = signal<string>('');
  protected readonly attendanceMap = signal<Record<string, boolean>>({});
  protected readonly replyDrafts: Record<string, string> = {};
  protected readonly reviewError = signal<string | null>(null);

  protected readonly pendingPayments = computed(() =>
    this.admin.payments().filter((p) => p.status === 'pending')
  );

  protected readonly scheduledLive = computed(() =>
    this.admin.liveClasses().filter((s) => s.status === 'scheduled')
  );

  protected readonly activeClass = computed(() =>
    this.admin.liveClasses().find((c) => c.id === this.selectedClassId()) || this.scheduledLive()[0] || null
  );

  protected readonly questions = signal<StudentQuestion[]>([
    {
      id: 'q1',
      student: 'Nour Saeed',
      stage: 'Sec 3',
      topic: 'Conditionals',
      question: 'In mixed conditionals, why do we use past perfect in the if-clause with would + infinitive in the result?',
      createdAt: '2026-10-23T11:15:00Z',
      status: 'pending',
    },
    {
      id: 'q2',
      student: 'Mariam Ali',
      stage: 'Sec 2',
      topic: 'Collocations',
      question: 'Is it correct to say "make a decision" or "take a decision" in formal essays?',
      createdAt: '2026-10-23T10:40:00Z',
      status: 'answered',
      answer: 'Both are standard, but "make a decision" is preferred in modern academic English. Great question!',
      answeredBy: 'Sara Hassan (Assistant)',
    },
    {
      id: 'q3',
      student: 'Karim Samy',
      stage: 'Sec 3',
      topic: 'Essay Writing',
      question: 'How many body paragraphs are recommended for the Thanawya Amma argumentative essay?',
      createdAt: '2026-10-23T09:20:00Z',
      status: 'pending',
    },
  ]);

  protected readonly pendingQuestionsCount = computed(
    () => this.questions().filter((q) => q.status === 'pending').length
  );

  protected studentsInStage(stage: string): AdminStudent[] {
    return this.admin.students().filter((s) => s.stage === stage || !stage);
  }

  protected getInitials(name: string): string {
    if (!name) return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  protected openImageModal(url: string, student: string): void {
    this.zoomedImage.set(url);
    this.zoomedStudent.set(student);
  }

  protected async approvePayment(id: string): Promise<void> {
    const res = await this.admin.reviewReceiptRpc(id, 'approved');
    if (!res.success) { this.reviewError.set(res.error || 'Review failed'); } else { this.reviewError.set(null); }
  }

  protected async rejectPayment(p: AdminPayment): Promise<void> {
    const defaultReason = this.i18n.lang() === 'ar' ? 'بيانات التحويل غير مطابقة أو لقطة الشاشة غير واضحة' : 'Payment reference or receipt details could not be verified';
    const note = prompt(
      this.i18n.lang() === 'ar' ? 'تأكيد رفض الإيصال - سبب الرفض:' : 'Confirm Payment Rejection - Reason:',
      defaultReason
    );
    if (note !== null) {
      const res = await this.admin.reviewReceiptRpc(p.id, 'rejected', note.trim() || defaultReason);
      if (!res.success) { this.reviewError.set(res.error || 'Review failed'); } else { this.reviewError.set(null); }
    }
  }

  protected async flagPayment(p: AdminPayment): Promise<void> {
    const note = prompt(
      this.i18n.lang() === 'ar' ? 'ملاحظة للمراجعة:' : 'Discrepancy note for Mr. Adel:',
      'Please verify transfer amount / reference'
    );
    if (note) {
      const res = await this.admin.reviewReceiptRpc(p.id, 'rejected', `Flagged by Assistant: ${note}`);
      if (!res.success) { this.reviewError.set(res.error || 'Review failed'); } else { this.reviewError.set(null); }
    }
  }

  protected toggleAttendance(classId: string, studentId: string): void {
    const key = `${classId}_${studentId}`;
    this.attendanceMap.update((m) => ({ ...m, [key]: !m[key] }));
  }

  protected sendAnswer(questionId: string): void {
    const draft = this.replyDrafts[questionId]?.trim();
    if (!draft) return;
    this.questions.update((list) =>
      list.map((q) =>
        q.id === questionId
          ? {
              ...q,
              status: 'answered',
              answer: draft,
              answeredBy: this.auth.user()?.fullName || 'Teaching Assistant',
            }
          : q
      )
    );
    this.replyDrafts[questionId] = '';
  }

  protected logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
