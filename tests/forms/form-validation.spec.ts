import { expect, test, Page } from '@playwright/test';

async function openDynamicForm(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email Address').fill('demo@forensics.gov');
  await page.getByLabel('Password').fill('demo123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/gan-models$/);
  await page.getByRole('button', { name: /Dynamic Form/ }).click();
  const form = page.locator('form.dyn-form');
  await expect(form).toBeVisible();
  return form;
}

test.describe('Dynamic form', () => {
  test('keeps submit disabled while required fields are empty', async ({ page }) => {
    const form = await openDynamicForm(page);
    await expect(form.getByRole('button', { name: 'Отправить' })).toBeDisabled();
  });

  test('shows required-field feedback after editing and clearing a required field', async ({ page }) => {
    const form = await openDynamicForm(page);
    const investigator = form.locator('.field').filter({ hasText: 'Investigator Name' });
    const input = investigator.locator('input');

    await input.fill('Investigator');
    await input.fill('');

    await expect(investigator).toHaveClass(/invalid/);
    await expect(investigator.getByText('Поле обязательно для заполнения.')).toBeVisible();
  });

  test('submits valid values and confirms success', async ({ page }) => {
    const form = await openDynamicForm(page);
    await form.locator('.field').filter({ hasText: 'Investigator Name' }).locator('input').fill('Automation User');
    await form.locator('select').selectOption('high');
    await form.locator('.multiselect-search .option-row').filter({ hasText: 'Face' }).locator('input').check();
    await form.locator('.field').filter({ hasText: 'Contact Phone' }).locator('input').fill('+15551234567');
    await form.locator('.field').filter({ hasText: 'Contact Email' }).locator('input').fill('automation@example.com');
    await form.locator('.rating-item').last().click();
    await form.locator('.field').filter({ hasText: 'Select GAN Models for Processing' }).locator('.chip-label').first().click();

    const dialogMessage = new Promise<string>((resolve) => {
      page.once('dialog', async (dialog) => {
        resolve(dialog.message());
        await dialog.accept();
      });
    });
    await form.getByRole('button', { name: 'Отправить' }).click();
    expect(await dialogMessage).toContain('Форма успешно отправлена');
  });

  test('filters and selects searchable evidence tags', async ({ page }) => {
    const form = await openDynamicForm(page);
    const searchableTags = form.locator('.multiselect-search');
    await expect(searchableTags).toBeVisible();
    await searchableTags.getByPlaceholder('Поиск...').fill('face');

    const faceOption = searchableTags.locator('.option-row').filter({ hasText: 'Face' });
    await expect(searchableTags.locator('.option-row')).toHaveCount(1);
    await faceOption.locator('input[type="checkbox"]').check();
    await expect(faceOption.locator('input[type="checkbox"]')).toBeChecked();
  });
});
