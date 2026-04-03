import { isPlatformBrowser } from '@angular/common';
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, of } from 'rxjs';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  expiresIn: number; // seconds
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // timestamp
  userId: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private apiUrl = '/api/auth'; // Configure this based on your backend

  private currentUserSubject = new BehaviorSubject<LoginResponse['user'] | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(
    isPlatformBrowser(this.platformId) && this.hasValidToken()
  );
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor() {
    this.loadStoredUser();
  }

  /**
   * Login with email and password
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap(response => this.handleLoginSuccess(response)),
        catchError(error => {
          console.error('Login failed:', error);
          return of(null as any);
        })
      );
  }

  /**
   * Logout current user
   */
  logout(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('isAuthenticated');
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);

    // Optional: Call backend logout endpoint
    this.http.post(`${this.apiUrl}/logout`, {}).subscribe({
      error: (err) => console.error('Backend logout failed:', err)
    });
  }

  /**
   * Refresh authentication token
   */
  refreshToken(refreshToken: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/refresh`, { refreshToken })
      .pipe(
        tap(response => this.handleLoginSuccess(response)),
        catchError(error => {
          console.error('Token refresh failed:', error);
          this.logout();
          return of(null as any);
        })
      );
  }

  /**
   * Register new user
   */
  register(email: string, password: string, name: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/register`, {
      email,
      password,
      name
    })
      .pipe(
        tap(response => this.handleLoginSuccess(response)),
        catchError(error => {
          console.error('Registration failed:', error);
          return of(null as any);
        })
      );
  }

  /**
   * Verify email for new account
   */
  verifyEmail(token: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.apiUrl}/verify-email`,
      { token }
    );
  }

  /**
   * Request password reset
   */
  requestPasswordReset(email: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.apiUrl}/forgot-password`,
      { email }
    );
  }

  /**
   * Reset password with token
   */
  resetPassword(token: string, newPassword: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.apiUrl}/reset-password`,
      { token, newPassword }
    );
  }

  /**
   * Get current authentication token
   */
  getToken(): string | null {
    const tokenData = this.getStoredToken();
    if (tokenData && this.isTokenExpired(tokenData.expiresAt)) {
      return tokenData.accessToken;
    }
    return null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.hasValidToken();
  }

  /**
   * Get current user
   */
  getCurrentUser(): LoginResponse['user'] | null {
    return this.currentUserSubject.value;
  }

  /**
   * Update user profile
   */
  updateProfile(userData: Partial<LoginResponse['user']>): Observable<LoginResponse['user']> {
    return this.http.put<LoginResponse['user']>(`${this.apiUrl}/profile`, userData)
      .pipe(
        tap(user => {
          this.currentUserSubject.next(user);
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('currentUser', JSON.stringify(user));
          }
        }),
        catchError(error => {
          console.error('Profile update failed:', error);
          return of(null as any);
        })
      );
  }

  /**
   * Change password
   */
  changePassword(currentPassword: string, newPassword: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.apiUrl}/change-password`,
      { currentPassword, newPassword }
    )
      .pipe(
        catchError(error => {
          console.error('Password change failed:', error);
          return of(null as any);
        })
      );
  }

  /**
   * Handle successful login
   */
  private handleLoginSuccess(response: LoginResponse): void {
    if (response && response.token) {
      const tokenData: AuthToken = {
        accessToken: response.token,
        refreshToken: response.refreshToken || undefined,
        expiresAt: Date.now() + (response.expiresIn * 1000),
        userId: response.user.id
      };

      this.currentUserSubject.next(response.user);
      this.isAuthenticatedSubject.next(true);

      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('authToken', JSON.stringify(tokenData));
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        sessionStorage.setItem('isAuthenticated', 'true');
        this.scheduleTokenRefresh(tokenData);
      }
    }
  }

  /**
   * Check if stored token is valid
   */
  private hasValidToken(): boolean {
    const tokenData = this.getStoredToken();
    return tokenData !== null && !this.isTokenExpired(tokenData.expiresAt);
  }

  /**
   * Get stored token from localStorage
   */
  private getStoredToken(): AuthToken | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const token = localStorage.getItem('authToken');
      return token ? JSON.parse(token) : null;
    } catch (e) {
      console.error('Error parsing stored token:', e);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(expiresAt: number): boolean {
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minute buffer
    return now > (expiresAt - bufferTime);
  }

  /**
   * Load stored user from localStorage
   */
  private loadStoredUser(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const userStr = localStorage.getItem('currentUser');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (this.hasValidToken()) {
          this.currentUserSubject.next(user);
          this.isAuthenticatedSubject.next(true);
        }
      }
    } catch (e) {
      console.error('Error loading stored user:', e);
    }
  }

  /**
   * Schedule token refresh before expiration
   */
  private scheduleTokenRefresh(tokenData: AuthToken): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (tokenData.refreshToken) {
      const now = Date.now();
      const expiresIn = tokenData.expiresAt - now;
      // Refresh token 5 minutes before expiration
      const refreshTime = Math.max(expiresIn - (5 * 60 * 1000), 0);

      setTimeout(() => {
        this.refreshToken(tokenData.refreshToken!).subscribe({
          error: (err) => {
            console.error('Auto refresh failed:', err);
            this.logout();
          }
        });
      }, refreshTime);
    }
  }
}
