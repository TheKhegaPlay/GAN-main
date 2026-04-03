/**
 * DashboardPage - Page Object Model
 * Abstracts dashboard page interactions after login
 * Used by: tests/dashboard/dashboard.spec.ts
 */

import { Page, expect } from '@playwright/test';

export class DashboardPage {
  private page: Page;

  // Selectors
  private readonly DASHBOARD_CONTAINER = '.dashboard-container, .main-content, main';
  private readonly USER_MENU = '[data-testid="user-menu"], .user-menu, .profile-menu';
  private readonly LOGOUT_BUTTON = 'button:has-text("Logout"), [data-testid="logout"]';
  private readonly USER_NAME_DISPLAY = '.user-name, [data-testid="user-name"], .header-user';
  private readonly NAVIGATION_MENU = 'nav, .sidebar, .navigation';
  private readonly PAGE_TITLE = 'h1, h2';

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate directly to dashboard
   */
  async navigateToDashboard(baseUrl: string = 'http://localhost:4200'): Promise<void> {
    await this.page.goto(`${baseUrl}/dashboard`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    await this.waitForDashboardLoad();
  }

  /**
   * Wait for dashboard to fully load
   */
  async waitForDashboardLoad(timeout: number = 10000): Promise<void> {
    await this.page.waitForSelector(this.DASHBOARD_CONTAINER, { timeout });
  }

  /**
   * Get user name displayed on dashboard
   */
  async getUserName(): Promise<string> {
    const userElement = await this.page.$(this.USER_NAME_DISPLAY);
    if (!userElement) {
      throw new Error('User name display element not found');
    }
    return (await userElement.textContent()) || '';
  }

  /**
   * Click logout button
   */
  async logout(): Promise<void> {
    // Open user menu if necessary
    const userMenu = await this.page.$(this.USER_MENU);
    if (userMenu) {
      await userMenu.click();
      await this.page.waitForTimeout(500);
    }

    // Click logout
    await this.page.click(this.LOGOUT_BUTTON);
    
    // Wait for redirect to login
    await this.page.waitForURL('**/login', { timeout: 5000 });
  }

  /**
   * Verify dashboard is displayed
   */
  async isDashboardDisplayed(): Promise<boolean> {
    const container = await this.page.$(this.DASHBOARD_CONTAINER);
    return container !== null;
  }

  /**
   * Verify navigation menu is visible
   */
  async isNavigationMenuVisible(): Promise<boolean> {
    const nav = await this.page.$(this.NAVIGATION_MENU);
    return nav !== null && (await nav.isVisible());
  }

  /**
   * Get page heading
   */
  async getPageHeading(): Promise<string> {
    const heading = await this.page.$(this.PAGE_TITLE);
    if (!heading) {
      return '';
    }
    return (await heading.textContent()) || '';
  }

  /**
   * Check if specific navigation item exists
   */
  async hasNavigationItem(itemName: string): Promise<boolean> {
    const item = await this.page.locator(`nav a:has-text("${itemName}"), nav button:has-text("${itemName}")`).first();
    return await item.isVisible().catch(() => false);
  }

  /**
   * Click navigation item
   */
  async clickNavigationItem(itemName: string): Promise<void> {
    const item = await this.page.locator(`nav a:has-text("${itemName}"), nav button:has-text("${itemName}")`).first();
    await item.click();
  }

  /**
   * Wait for specific element to be visible
   */
  async waitForElement(selector: string, timeout: number = 5000): Promise<void> {
    await this.page.waitForSelector(selector, { timeout });
  }

  /**
   * Get current page URL
   */
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  /**
   * Verify user is authenticated (dashboard visible)
   */
  async isUserAuthenticated(): Promise<boolean> {
    try {
      await this.waitForDashboardLoad(3000);
      return true;
    } catch {
      return false;
    }
  }
}
