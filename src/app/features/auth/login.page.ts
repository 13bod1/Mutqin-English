import { Component, inject, signal } from '@angular/core';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/data/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { GoogleIconComponent } from '../../shared/ui/google-icon.component';

@Component({
  selector: 'app-login',
  imports: [FormsModule, ReactiveFormsModule, RouterLink, LucideAngularModule, TranslatePipe, GoogleIconComponent],
  templateUrl: './login.page.html',
})
export class LoginPage {
  protected readonly i18n = inject(LanguageService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    remember: [true],
  });

  protected readonly submitted = signal(false);
  protected readonly loading = signal(false);
  protected readonly authError = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  // Forgot password state
  protected readonly forgotModalOpen = signal(false);
  protected readonly forgotEmail = signal('');
  protected readonly newPassword = signal('');
  protected readonly forgotLoading = signal(false);
  protected readonly forgotSuccess = signal<string | null>(null);
  protected readonly forgotError = signal<string | null>(null);
  protected readonly canDirectReset = signal(false);
  protected readonly passwordResetDone = signal(false);

  protected showError(name: 'email' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  protected submit(): void {
    this.submitted.set(true);
    this.authError.set(false);
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: (u) => {
        this.loading.set(false);
        if (u.role === 'admin') {
          this.router.navigateByUrl('/admin');
        } else if (u.role === 'assistant') {
          this.router.navigateByUrl('/assistant');
        } else {
          this.router.navigateByUrl('/progress');
        }
      },
      error: (err: any) => {
        this.loading.set(false);
        this.authError.set(true);
        if (err?.message && !err.message.includes('Invalid login credentials')) {
          this.errorMessage.set(err.message);
        }
      },
    });
  }

  protected google(): void {
    this.auth.continueWithGoogle();
  }

  protected openForgotModal(): void {
    this.forgotEmail.set(this.form.controls.email.value || '');
    this.newPassword.set('');
    this.forgotSuccess.set(null);
    this.forgotError.set(null);
    this.canDirectReset.set(false);
    this.passwordResetDone.set(false);
    this.forgotModalOpen.set(true);
  }

  protected closeForgotModal(): void {
    this.forgotModalOpen.set(false);
  }

  protected submitForgot(): void {
    const email = this.forgotEmail().trim();
    if (!email || !email.includes('@')) {
      this.forgotError.set(this.i18n.lang() === 'ar' ? 'يرجى إدخال بريد إلكتروني صحيح.' : 'Please enter a valid email address.');
      return;
    }

    this.forgotLoading.set(true);
    this.forgotError.set(null);
    this.forgotSuccess.set(null);

    const newPwd = this.newPassword().trim();

    this.auth.requestPasswordReset(email, newPwd || undefined).subscribe({
      next: (res) => {
        this.forgotLoading.set(false);
        if (res.updated) {
          this.passwordResetDone.set(true);
          this.forgotSuccess.set(
            this.i18n.lang() === 'ar'
              ? 'تم تحديث كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول مباشرة.'
              : 'Password successfully updated! You can now log in.'
          );
          this.form.controls.email.setValue(email);
          this.form.controls.password.setValue(newPwd);
        } else {
          this.forgotSuccess.set(
            this.i18n.lang() === 'ar'
              ? 'تم إرسال تعليمات استعادة كلمة المرور إلى بريدك الإلكتروني.'
              : 'Password reset link sent to your email.'
          );
          if (res.accountFound) {
            this.canDirectReset.set(true);
          }
        }
      },
      error: () => {
        this.forgotLoading.set(false);
        this.forgotError.set(
          this.i18n.lang() === 'ar'
            ? 'حدث خطأ. يرجى التواصل مع الدعم عبر واتساب.'
            : 'An error occurred. Please contact support via WhatsApp.'
        );
      },
    });
  }
}
