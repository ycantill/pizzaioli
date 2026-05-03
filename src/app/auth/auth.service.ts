import { computed, Injectable, signal } from '@angular/core';
import {
  getAuth,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
  ConfirmationResult,
  User,
} from 'firebase/auth';
import { app } from '../firebase.config';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = getAuth(app);

  readonly currentUser = signal<User | null | undefined>(undefined);
  readonly isLoading = computed(() => this.currentUser() === undefined);
  readonly isAuthenticated = computed(
    () => this.currentUser() !== null && this.currentUser() !== undefined,
  );

  private confirmationResult: ConfirmationResult | null = null;
  private recaptchaVerifier: RecaptchaVerifier | null = null;

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser.set(user);
    });
  }

  initRecaptcha(containerId: string): void {
    if (this.recaptchaVerifier) {
      this.recaptchaVerifier.clear();
    }
    this.recaptchaVerifier = new RecaptchaVerifier(this.auth, containerId, {
      size: 'invisible',
    });
  }

  async sendVerificationCode(phoneNumber: string): Promise<void> {
    if (!this.recaptchaVerifier) {
      throw new Error('reCAPTCHA not initialized');
    }
    this.confirmationResult = await signInWithPhoneNumber(
      this.auth,
      phoneNumber,
      this.recaptchaVerifier,
    );
  }

  async confirmCode(code: string): Promise<void> {
    if (!this.confirmationResult) {
      throw new Error('No pending verification. Please request a code first.');
    }
    await this.confirmationResult.confirm(code);
  }

  resetVerification(): void {
    this.confirmationResult = null;
    if (this.recaptchaVerifier) {
      this.recaptchaVerifier.clear();
      this.recaptchaVerifier = null;
    }
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(this.auth);
  }
}
