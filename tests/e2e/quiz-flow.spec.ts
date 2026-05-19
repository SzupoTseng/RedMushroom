import { test, expect } from '@playwright/test';

test.describe('Quiz Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Login page renders', async ({ page }) => {
    await expect(page.getByText('RedMushroom')).toBeVisible();
    await expect(page.getByPlaceholder('輸入帳號')).toBeVisible();
  });

  test('Login with demo student', async ({ page }) => {
    await page.fill('[placeholder="輸入帳號"]', 'student1');
    await page.fill('[placeholder="輸入密碼"]', 'student123');
    await page.click('button[type="submit"]');

    await expect(page.getByText('今天要練習哪個主題？')).toBeVisible({ timeout: 10_000 });
  });

  test('Start quiz flow', async ({ page }) => {
    // 先登入
    await page.fill('[placeholder="輸入帳號"]', 'student1');
    await page.fill('[placeholder="輸入密碼"]', 'student123');
    await page.click('button[type="submit"]');
    await expect(page.getByText('今天要練習哪個主題？')).toBeVisible({ timeout: 10_000 });

    // 選擇主題
    await page.getByText('語詞認知').click();

    // 應出現題目
    await expect(page.locator('.answer-btn').first()).toBeVisible({ timeout: 10_000 });
  });

  test('IDOR: session result requires auth', async ({ request }) => {
    const res = await request.get('/api/quiz/session/1');
    expect(res.status()).toBe(401);
  });

  test('API: start quiz does not leak correct_answer', async ({ request }) => {
    // 先取得 token
    const loginRes = await request.post('/api/auth/login', {
      data: { username: 'student1', password: 'student123' },
    });
    const { token } = await loginRes.json() as { token: string };

    const res = await request.post('/api/quiz/start', {
      data: { theory_type: 'cognitive', subject: 'chinese' },
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok()) {
      const data = await res.json() as { questions: Array<Record<string, unknown>> };
      for (const q of data.questions) {
        expect(q).not.toHaveProperty('correct_answer');
      }
    }
  });
});
