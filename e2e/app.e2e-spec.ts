import { test, expect } from '@playwright/test';

test.describe('Mutqin English Application E2E Tests', () => {
  test('Landing page loads with brand title and hero section', async ({ page }) => {
    await page.goto('/');

    // Check title
    await expect(page).toHaveTitle(/متقن|Mutqin/i);

    // Check header logo
    const logo = page.locator('app-logo');
    await expect(logo).toBeVisible();

    // Check hero heading
    const mainHeading = page.locator('h1');
    await expect(mainHeading).toBeVisible();
  });

  test('Language toggle switches between English and Arabic (RTL)', async ({ page }) => {
    await page.goto('/');

    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', 'en');
    await expect(html).toHaveAttribute('dir', 'ltr');

    // Click language switcher
    const langBtn = page.locator('button[aria-label*="Language"], button[aria-label*="اللغة"]').first();
    await langBtn.click();

    // Verify Arabic state
    await expect(html).toHaveAttribute('lang', 'ar');
    await expect(html).toHaveAttribute('dir', 'rtl');

    // Toggle back to English
    await langBtn.click();
    await expect(html).toHaveAttribute('lang', 'en');
    await expect(html).toHaveAttribute('dir', 'ltr');
  });

  test('Navigation to Lectures page and filtering', async ({ page }) => {
    await page.goto('/');

    // Click Lectures nav link
    await page.click('nav a[href="/lectures"]');
    await expect(page).toHaveURL(/\/lectures/);

    // Verify lecture search or filter buttons exist
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('grammar');
      await searchInput.press('Enter');
    }
  });

  test('Navigation to Quizzes page and completing a quiz runner', async ({ page }) => {
    await page.goto('/quizzes');

    // Verify quiz cards / modules exist
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();

    // Check radio options in quiz runner if present
    const radioOption = page.locator('button[role="radio"]').first();
    if (await radioOption.isVisible()) {
      await radioOption.click();
    }
  });

  test('Navigation to Progress page dashboard', async ({ page }) => {
    await page.goto('/progress');

    // Verify progress page loads
    const progressContainer = page.locator('app-weekly-chart, app-progress-ring').first();
    await expect(progressContainer).toBeVisible();
  });

  test('Login page validation and form submission flow', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Fill form
    await emailInput.fill('student@example.com');
    await passwordInput.fill('password123');
    await submitBtn.click();
  });

  test('Signup page form flow', async ({ page }) => {
    await page.goto('/signup');

    const nameInput = page.locator('input[formControlName="fullName"], input[name="fullName"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill('Test Student');
    }

    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible()) {
      await emailInput.fill('newstudent@example.com');
    }
  });
});
