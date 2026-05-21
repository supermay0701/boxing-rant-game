import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AVATAR = path.join(__dirname, 'fixtures', 'test-avatar.png');

test('full happy path: setup → game → replay', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/?duration=3000');
  await expect(page.locator('#screen-setup')).toBeVisible();

  // Puncher tab (active by default)
  await page.locator('#screen-setup input[type=text]').first().fill('小明');
  await page.locator('#screen-setup input[type=file]').nth(0).setInputFiles(AVATAR);
  // Crop UI appears — confirm the crop to apply cartoon filter
  await page.locator('.crop-confirm').first().click();
  await page.locator('input.talk').first().fill('雷包');

  // Wait for cartoon filter to complete (avatar processed → state updated)
  await page.waitForTimeout(500);

  // Switch to victim tab
  await page.locator('.tab[data-tab=victim]').click();
  await page.locator('#screen-setup input[type=text]').first().fill('阿德');
  await page.locator('#screen-setup input[type=file]').nth(0).setInputFiles(AVATAR);
  // Crop UI appears — confirm the crop
  await page.locator('.crop-confirm').first().click();

  await page.waitForTimeout(500);

  // Switch back to puncher to click start button
  await page.locator('.tab[data-tab=puncher]').click();
  const startBtn = page.locator('.start-btn');
  await expect(startBtn).toBeEnabled({ timeout: 5000 });

  await startBtn.click();
  await expect(page.locator('#screen-game')).toBeVisible();
  await expect(page.locator('#game-canvas')).toBeVisible();

  // duration=3000 means game ends in ~3s, then replay shows
  await expect(page.locator('#screen-replay')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.stats-grid')).toBeVisible();
});
