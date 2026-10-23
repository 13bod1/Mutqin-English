import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/data/auth.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { GoogleIconComponent } from '../../shared/ui/google-icon.component';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule, TranslatePipe, GoogleIconComponent],
  templateUrl: './login.page.html',
})
export class LoginPage {
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

  protected showError(name: 'email' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  protected fillAdmin(): void {
    this.form.patchValue({
      email: 'adel@adelmostafa.com',
      password: '3:hhL-Ds7zVYCg:',
    });
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
        if (u.role === 'admin' || u.role === 'assistant') {
          this.router.navigateByUrl('/admin');
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
}
