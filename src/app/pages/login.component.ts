import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  // Avoid SSR/hydration fighting reactive forms (typed text can stay out of FormGroup → valid never true).
  host: { '[attr.ngSkipHydration]': 'true' },
  template: `
    <div class="login-container">
      <div class="login-box">
        <div class="login-header">
          <h1>🔐 {{ isRegistering ? 'Create account' : 'Forensic Platform Login' }}</h1>
          <p>GAN-based Evidence Restoration System</p>
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onLogin()" class="login-form">
          <div class="form-group" *ngIf="isRegistering">
            <label for="name">Full Name</label>
            <input
              formControlName="name"
              type="text"
              id="name"
              autocomplete="name"
              placeholder="Investigator name"
              class="form-input"
            />
            <div *ngIf="loginForm.get('name')?.invalid && loginForm.get('name')?.touched">
              <span class="error-message">Full name is required</span>
            </div>
          </div>

          <div class="form-group">
            <label for="email">Email Address</label>
            <input
              formControlName="email"
              type="email"
              id="email"
              placeholder="investigator&#64;forensics.gov"
              class="form-input"
            />
            <div *ngIf="loginForm.get('email')?.hasError('required') && loginForm.get('email')?.touched">
              <span class="error-message">Email is required</span>
            </div>
            <div *ngIf="loginForm.get('email')?.hasError('email') && loginForm.get('email')?.touched">
              <span class="error-message">Please enter a valid email</span>
            </div>
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              formControlName="password"
              type="password"
              id="password"
              [attr.autocomplete]="isRegistering ? 'new-password' : 'current-password'"
              placeholder="Enter your password"
              class="form-input"
            />
            <div *ngIf="loginForm.get('password')?.hasError('required') && loginForm.get('password')?.touched">
              <span class="error-message">Password is required</span>
            </div>
            <div *ngIf="loginForm.get('password')?.hasError('minlength') && loginForm.get('password')?.touched">
              <span class="error-message">
                Password must be at least {{ isRegistering ? 10 : 6 }} characters
              </span>
            </div>
          </div>

          <div *ngIf="errorMessage" class="error-alert">
            {{ errorMessage }}
          </div>

          <button
            type="submit"
            [disabled]="isLoading"
            class="submit-button"
          >
            {{ isLoading ? 'Please wait...' : isRegistering ? 'Create account' : 'Login' }}
          </button>
        </form>

        <button type="button" class="mode-toggle" (click)="toggleMode()" [disabled]="isLoading">
          {{ isRegistering ? 'Already have an account? Sign in' : 'New investigator? Create an account' }}
        </button>
      </div>

      <div class="footer-info">
        <p>🔬 Advanced Digital Forensics Platform</p>
        <p>Using AI-powered GAN models for evidence restoration</p>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .login-box {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      padding: 50px;
      width: 100%;
      max-width: 450px;
      animation: slideUp 0.5s ease-out;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .login-header {
      text-align: center;
      margin-bottom: 40px;
    }

    .login-header h1 {
      color: #333;
      margin: 0;
      font-size: 28px;
      margin-bottom: 8px;
    }

    .login-header p {
      color: #999;
      margin: 0;
      font-size: 14px;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-group label {
      color: #333;
      font-weight: 600;
      font-size: 14px;
    }

    .form-input {
      padding: 12px 16px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      transition: all 0.3s ease;
      font-family: inherit;
    }

    .form-input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-input:disabled {
      background: #f5f5f5;
      cursor: not-allowed;
    }

    .error-message {
      color: #ef4444;
      font-size: 12px;
    }

    .error-alert {
      background: #fee2e2;
      color: #991b1b;
      padding: 12px;
      border-radius: 8px;
      font-size: 14px;
      border-left: 4px solid #ef4444;
    }

    .submit-button {
      padding: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.3s ease;
      margin-top: 20px;
    }

    .submit-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
    }

    .submit-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .mode-toggle {
      display: block;
      margin: 18px auto 0;
      padding: 8px;
      border: 0;
      background: transparent;
      color: #4f46a5;
      font: inherit;
      cursor: pointer;
    }

    .mode-toggle:disabled {
      cursor: not-allowed;
      opacity: .6;
    }

    .footer-info {
      margin-top: 40px;
      text-align: center;
      color: rgba(255, 255, 255, 0.9);
    }

    .footer-info p {
      margin: 5px 0;
      font-size: 14px;
    }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  isRegistering = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      name: [''],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  toggleMode(): void {
    this.isRegistering = !this.isRegistering;
    const name = this.loginForm.get('name');
    const password = this.loginForm.get('password');
    name?.setValidators(this.isRegistering ? [Validators.required] : []);
    password?.setValidators([
      Validators.required,
      Validators.minLength(this.isRegistering ? 10 : 6)
    ]);
    name?.updateValueAndValidity();
    password?.updateValueAndValidity();
    this.errorMessage = null;
  }

  onLogin() {
    this.errorMessage = null;
    this.loginForm.markAllAsTouched();

    if (!this.loginForm.valid) {
      return;
    }

    const { name, email, password } = this.loginForm.value;
    if (this.isRegistering && !String(name || '').trim()) {
      this.errorMessage = 'Full name is required';
      return;
    }

    this.isLoading = true;
    const request = this.isRegistering
      ? this.authService.register(String(email).trim(), password, String(name).trim())
      : this.authService.login({ email: String(email).trim(), password });

    request.subscribe({
      next: () => {
        this.router.navigate(['/gan-models']).finally(() => {
          this.isLoading = false;
        });
      },
      error: (error: HttpErrorResponse) => {
        const detail = error.error?.detail;
        this.errorMessage = typeof detail === 'string'
          ? detail
          : error.message || 'Authentication failed. Please try again.';
        this.isLoading = false;
      }
    });
  }
}
