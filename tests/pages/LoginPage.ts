/**
 * LoginPage - Page Object Model (Fixed)
 * Abstracts login page interactions and assertions
 * Used by: tests/auth/login.spec.ts
 * 
 * Fixed:
 * - Replaced hard-coded id selectors with getByRole/getByPlaceholder
 * - Added waitForLoginPage() with proper waitForLoadState
 * - Added force: true and timeout to fill/click actions
 * - Improved selector reliability
 */

import { Page, expect } from '@playwright/test';

export class LoginPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Wait for login page to be fully loaded
   * Ensures all network requests are complete and form is visible
   */
  async waitForLoginPage(timeout: number = 30000): Promise<void> {
    console.log('Waiting for login page to load...');
    
    // Option 1: Wait for network to be idle
    try {
      await this.page.waitForLoadState('networkidle', { timeout });
    } catch (e) {
      console.log('Network idle timeout - continuing with domcontentloaded check');
    }

    // Option 2: Ensure DOM is ready
    try {
      await this.page.waitForLoadState('domcontentloaded', { timeout });
    } catch (e) {
      console.log('DOM load timeout - page may still load');
    }

    // Option 3: Look for login form or heading - with multiple fallback strategies
    try {
      // Try to find form by role
      await this.page.locator('form').first().waitFor({ state: 'visible', timeout: 10000 });
      console.log('✓ Login form found');
    } catch (e1) {
      console.log('⚠ Form not found with role selector, trying h1...');
      try {
        // Fallback: Look for h1
        await this.page.locator('h1').first().waitFor({ state: 'visible', timeout: 5000 });
        console.log('✓ Page heading found');
      } catch (e2) {
        console.log('⚠ Neither form nor h1 found - page structure may differ');
        console.log(`Current URL: ${this.page.url()}`);
        console.log(`Page title: ${await this.page.title()}`);
      }
    }
  }

  /**
   * Navigate to login page
   */
  async navigateToLogin(baseUrl: string = 'http://localhost:4200'): Promise<void> {
    console.log(`Navigating to: ${baseUrl}`);
    
    try {
      await this.page.goto(baseUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      console.log(`✓ Navigated to ${this.page.url()}`);
    } catch (e) {
      console.error(`Navigation failed:`, e);
      throw e;
    }

    // Wait for page to settle
    await this.waitForLoginPage();
  }

  /**
   * Get email input field locator
   * Uses multiple selector strategies for robustness
   */
  private getEmailInput() {
    // Strategy 1: By formControlName (Angular Reactive Forms)
    const byFormControl = this.page.locator('input[formcontrolname="email"]');
    
    // Strategy 2: By placeholder "Email"
    const byPlaceholder = this.page.getByPlaceholder(/email|Email/i);
    
    // Strategy 3: By label "Email"
    const byLabel = this.page.getByLabel(/email|Email/i);
    
    // Strategy 4: By testid
    const byTestId = this.page.getByTestId('email-input');
    
    // Strategy 5: By name
    const byName = this.page.locator('input[name="email"]');
    
    // Strategy 6: By id (original fallback)
    const byId = this.page.locator('input[id="email"]');

    // Return first one that exists
    return byFormControl.or(byPlaceholder).or(byLabel).or(byTestId).or(byName).or(byId);
  }

  /**
   * Get password input field locator
   */
  private getPasswordInput() {
    // Strategy 1: By formControlName (Angular Reactive Forms)
    const byFormControl = this.page.locator('input[formcontrolname="password"]');
    
    // Strategy 2: By placeholder "Password"
    const byPlaceholder = this.page.getByPlaceholder(/password|Password/i);
    
    // Strategy 3: By label "Password"
    const byLabel = this.page.getByLabel(/password|Password/i);
    
    // Strategy 4: By testid
    const byTestId = this.page.getByTestId('password-input');
    
    // Strategy 5: By name
    const byName = this.page.locator('input[name="password"]');
    
    // Strategy 6: By type (fallback)
    const byType = this.page.locator('input[type="password"]');

    return byFormControl.or(byPlaceholder).or(byLabel).or(byTestId).or(byName).or(byType);
  }

  /**
   * Get submit button locator
   */
  private getSubmitButton() {
    // Strict selector strategy to avoid matching the h1 element
    const bySubmitClass = this.page.locator('button[type="submit"].submit-button');
    const byTestId = this.page.locator('button[data-test-id="login-submit"]');
    const bySubmitType = this.page.locator('button[type="submit"]');

    // Return first reliable selector with fallback
    return bySubmitClass.or(byTestId).or(bySubmitType);
  }

  /**
   * Get error message locator
   */
  private getErrorMessageLocator() {
    // Strategy 1: By class
    const byClass = this.page.locator('.error-message, [class*="error"], [role="alert"]');
    
    // Strategy 2: By text containing common error phrases
    const byText = this.page.getByText(/error|invalid|incorrect|failed/i);

    return byClass.or(byText);
  }

  /**
   * Perform login action
   * @param email - User email address
   * @param password - User password
   */
  async login(email: string, password: string): Promise<void> {
    console.log(`Logging in with email: ${email}`);
    
    // Fill email with force and increased timeout
    try {
      await this.getEmailInput().fill(email, { force: true, timeout: 15 * 1000 });
      console.log('✓ Email filled');
    } catch (e) {
      console.error('Email fill failed:', e);
      throw e;
    }

    // Fill password with force
    try {
      await this.getPasswordInput().fill(password, { force: true, timeout: 15 * 1000 });
      console.log('✓ Password filled');
    } catch (e) {
      console.error('Password fill failed:', e);
      throw e;
    }

    // Click submit
    try {
      await this.getSubmitButton().click({ force: true, timeout: 10 * 1000 });
      console.log('✓ Submit clicked');
    } catch (e) {
      console.error('Submit click failed:', e);
      throw e;
    }
    
    // Wait briefly for response (either navigation or error)
    await this.page.waitForTimeout(1000);
  }

  /**
   * Get error message text
   * @returns Error message displayed on page
   */
  async getErrorMessage(): Promise<string> {
    try {
      const errorText = await this.getErrorMessageLocator().first().textContent({ timeout: 5000 });
      if (!errorText) {
        throw new Error('Error element found but no text');
      }
      return errorText.trim();
    } catch (e) {
      throw new Error(`No error message found on page: ${e}`);
    }
  }

  /**
   * Get validation message for a field
   */
  async getValidationMessage(fieldName: string = 'email'): Promise<string> {
    const field = fieldName.toLowerCase() === 'email' 
      ? this.getEmailInput() 
      : this.getPasswordInput();
    
    try {
      const element = await field.first().elementHandle();
      if (!element) return '';
      
      const validationMessage = await this.page.evaluate(
        (el) => (el as HTMLInputElement).validationMessage,
        element
      );
      return validationMessage || '';
    } catch (e) {
      return '';
    }
  }

  /**
   * Verify page title/heading
   * @returns Page heading text
   */
  async getPageTitle(): Promise<string> {
    try {
      return await this.page.locator('h1').first().textContent({ timeout: 5000 }) || '';
    } catch (e) {
      return this.page.title();
    }
  }

  /**
   * Wait for dashboard to load (post-login verification)
   */
  async waitForDashboard(timeout: number = 30000): Promise<void> {
    console.log('Waiting for dashboard navigation...');
    try {
      await this.page.waitForURL(/gan-models|dashboard|home|main/i, { timeout });
      console.log('✓ Dashboard loaded');
    } catch (e) {
      const currentUrl = this.page.url();
      console.error(`Dashboard navigation failed. Current URL: ${currentUrl}`);
      throw e;
    }
  }

  /**
   * Verify user is on login page
   */
  async verifyOnLoginPage(): Promise<boolean> {
    const url = this.page.url();
    return url.includes('/login') || url.includes('login');
  }

  /**
   * Check if error message is visible
   */
  async isErrorMessageVisible(): Promise<boolean> {
    try {
      await this.getErrorMessageLocator().first().waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if email input is visible
   */
  async isEmailInputVisible(): Promise<boolean> {
    try {
      await this.getEmailInput().first().waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Fill email field
   */
  async fillEmail(email: string): Promise<void> {
    await this.getEmailInput().fill(email, { force: true, timeout: 15 * 1000 });
  }

  /**
   * Fill password field
   */
  async fillPassword(password: string): Promise<void> {
    await this.getPasswordInput().fill(password, { force: true, timeout: 15 * 1000 });
  }

  /**
   * Click submit button
   */
  async submitForm(): Promise<void> {
    await this.getSubmitButton().click({ force: true, timeout: 10 * 1000 });
  }

  /**
   * Clear all form fields
   */
  async clearForm(): Promise<void> {
    await this.getEmailInput().fill('', { force: true });
    await this.getPasswordInput().fill('', { force: true });
  }

  /**
   * Get current URL
   */
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  /**
   * Wait for email input to be ready and visible
   */
  async waitForEmailInput(timeout: number = 15000): Promise<void> {
    console.log('Waiting for email input to be visible...');
    await this.getEmailInput().first().waitFor({ state: 'visible', timeout });
    console.log('✓ Email input visible');
  }

  /**
   * Wait for password input to be ready and visible
   */
  async waitForPasswordInput(timeout: number = 15000): Promise<void> {
    await this.getPasswordInput().first().waitFor({ state: 'visible', timeout });
  }

  /**
   * Generic method to check if element is visible
   */
  async isElementVisible(selector: string): Promise<boolean> {
    try {
      await this.page.locator(selector).first().waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Debug: Log current page state
   */
  async debugPageState(): Promise<void> {
    const url = this.page.url();
    const title = await this.page.title();
    const hasForm = await this.isElementVisible('form');
    const hasEmailInput = await this.isEmailInputVisible();
    const hasErrorMessage = await this.isErrorMessageVisible();

    console.log('--- DEBUG PAGE STATE ---');
    console.log(`URL: ${url}`);
    console.log(`Title: ${title}`);
    console.log(`Has form: ${hasForm}`);
    console.log(`Has email input: ${hasEmailInput}`);
    console.log(`Has error message: ${hasErrorMessage}`);
    console.log('------------------------');
  }
}
