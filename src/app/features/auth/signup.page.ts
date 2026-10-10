import { Component, inject, signal } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/data/auth.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AcademicStage } from '../../core/models/lecture';
import { GoogleIconComponent } from '../../shared/ui/google-icon.component';

/** 8+ characters, at least one digit and one symbol. */
const STRONG_PASSWORD = /^(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const { password, confirm } = group.value as { password: string; confirm: string };
  return confirm && password !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule, TranslatePipe, GoogleIconComponent],
  templateUrl: './signup.page.html',
})
export class SignupPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly stages: AcademicStage[] = ['prep', 'sec1', 'sec2', 'sec3', 'university'];

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      stage: ['' as AcademicStage | '', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.pattern(STRONG_PASSWORD)]],
      confirm: ['', Validators.required],
      terms: [false, Validators.requiredTrue],
    },
    { validators: passwordsMatch },
  );

  protected readonly submitted = signal(false);
  protected readonly loading = signal(false);
  protected readonly authError = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly showConfirm = signal(false);

  protected showError(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  protected get mismatch(): boolean {
    const confirm = this.form.controls.confirm;
    return this.form.hasError('mismatch') && (confirm.touched || this.submitted());
  }

  protected get matches(): boolean {
    const { password, confirm } = this.form.getRawValue();
    return !!confirm && password === confirm;
  }

  protected submit(): void {
    this.submitted.set(true);
    this.authError.set(false);
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.loading.set(true);
    this.auth
      .signup({ fullName: v.fullName, stage: v.stage as AcademicStage, email: v.email, password: v.password })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigateByUrl('/progress');
        },
        error: (err: any) => {
          this.loading.set(false);
          this.authError.set(true);
          this.errorMessage.set(err?.message || null);
        },
      });
  }


  protected google(): void {
    this.auth.continueWithGoogle();
  }
}
