import { test, expect } from '@playwright/test';

test.describe('E-Commerce Intelligence Platform Smoke Test', () => {
  test('Landing -> Dashboard -> Predict -> Models workflow', async ({ page }) => {
    // 1. Landing Page
    await page.goto('http://localhost:5173/');
    await expect(page).toHaveTitle(/Smart E-Commerce Customer Intelligence/);
    await expect(page.locator('text=Know who will buy')).toBeVisible();

    // 2. Navigate to Dashboard
    await page.click('text=Explore Executive Dashboard');
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('text=Executive Intelligence Dashboard')).toBeVisible();
    await expect(page.locator('text=Total Sessions')).toBeVisible();

    // 3. Navigate to Predict
    await page.click('text=Purchase Intent Prediction');
    await expect(page).toHaveURL(/.*predict/);
    await expect(page.locator('text=High-Intent Buyer')).toBeVisible();

    // Click preset and submit
    await page.click('text=High-Intent Buyer');
    await page.click('text=Run Purchase Prediction');
    await expect(page.locator('text=Prediction Readout')).toBeVisible();
    await expect(page.locator('text=Top Predictive Drivers')).toBeVisible();

    // 4. Navigate to Models Leaderboard
    await page.click('text=Model Leaderboard');
    await expect(page).toHaveURL(/.*models/);
    await expect(page.locator('text=Candidate Models Leaderboard')).toBeVisible();
    await expect(page.locator('text=CatBoost')).toBeVisible();
  });
});
