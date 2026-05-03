import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatIconModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly step = signal<'phone' | 'otp'>('phone');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly countryCode = '+57';

  readonly phoneForm = new FormGroup({
    phone: new FormControl('', [
      Validators.required,
      Validators.pattern(/^\d{7,10}$/),
    ]),
  });

  readonly otpForm = new FormGroup({
    code: new FormControl('', [
      Validators.required,
      Validators.pattern(/^\d{6}$/),
    ]),
  });

  constructor() {
    afterNextRender(() => {
      this.authService.initRecaptcha('recaptcha-container');
    });
  }

  async sendCode(): Promise<void> {
    if (this.phoneForm.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.authService.sendVerificationCode(this.countryCode + this.phoneForm.value.phone!);
      this.step.set('otp');
    } catch {
      this.error.set('Error al enviar el código. Por favor, intentá de nuevo.');
      this.authService.resetVerification();
      this.authService.initRecaptcha('recaptcha-container');
    } finally {
      this.loading.set(false);
    }
  }

  async verifyCode(): Promise<void> {
    if (this.otpForm.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.authService.confirmCode(this.otpForm.value.code!);
      this.router.navigate(['/']);
    } catch {
      this.error.set('Código inválido. Por favor, intentá de nuevo.');
    } finally {
      this.loading.set(false);
    }
  }

  goBack(): void {
    this.step.set('phone');
    this.otpForm.reset();
    this.error.set(null);
    this.authService.resetVerification();
    this.authService.initRecaptcha('recaptcha-container');
  }
}
