import { test, expect, request } from '@playwright/test';
import { testUrls, apiEndpoints } from '../utils/test-data';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000/api';

// Increase timeout for CIs and slow environments
test.setTimeout(60000);

test.describe('Registration API - TC08-TC10', () => {
  test('TC08: Should register a new user', async ({ request }) => {
    const randomEmail = `autotest.${Date.now()}@forensics.gov`;

    const response = await request.post(`${API_BASE_URL}${apiEndpoints.register}`, {
      data: {
        name: 'Auto Test',
        email: randomEmail,
        password: 'AutoPass123!'
      }
    });

    expect([200, 201]).toContain(response.status());

    const body = await response.json();
    expect(body.success).toBeTruthy();
    expect(body.user)?.toBeTruthy();
    expect(body.user.email).toBe(randomEmail);
  });

  test('TC09: Should fail duplicate registration with 409', async ({ request }) => {
    const duplicateEmail = 'demo@forensics.gov';

    const response = await request.post(`${API_BASE_URL}${apiEndpoints.register}`, {
      data: {
        name: 'Duplicate Test',
        email: duplicateEmail,
        password: 'AutoPass123!'
      }
    });

    expect([400, 409]).toContain(response.status());
    const body = await response.json();
    expect(body.success).toBeFalsy();
    expect(body.error.toLowerCase()).toContain('email');
  });

  test('TC10: Should reject missing fields with 400', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}${apiEndpoints.register}`, {
      data: {
        email: `missingfield.${Date.now()}@forensics.gov`
      }
    });

    expect([400, 422]).toContain(response.status());
    const body = await response.json();
    expect(body.success).toBeFalsy();
  });
});
