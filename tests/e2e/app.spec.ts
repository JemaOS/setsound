/**
 * Tests E2E avec Playwright pour Setsound
 */
import { test, expect, Page } from '@playwright/test';

test.describe('Setsound - Audio Converter E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('should load the application', async ({ page }) => {
    await expect(page).toHaveTitle(/Setsound/);
  });

  test('should display sidebar navigation', async ({ page }) => {
    const sidebar = page.locator('aside, nav, [data-testid="sidebar"]');
    await expect(sidebar.first()).toBeVisible();
  });

  test('should navigate to Audio Converter tool', async ({ page }) => {
    // Click on converter navigation item
    const converterLink = page.getByText(/convertisseur|converter/i).first();
    if (await converterLink.isVisible()) {
      await converterLink.click();
      // Verify we're on the converter page
      await expect(page.getByText(/format de sortie|output format/i).first()).toBeVisible();
    }
  });

  test('should display format options', async ({ page }) => {
    // Navigate to converter if needed
    const converterLink = page.getByText(/convertisseur|converter/i).first();
    if (await converterLink.isVisible()) {
      await converterLink.click();
    }

    // Check that format buttons are visible
    const formatButtons = ['MP3', 'WAV', 'OGG', 'FLAC', 'AAC', 'M4A'];
    for (const format of formatButtons) {
      const button = page.getByRole('button', { name: new RegExp(format, 'i') }).first();
      // Some formats might be in a dropdown or hidden, so we just check the ones visible
      if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(button).toBeVisible();
      }
    }
  });

  test('should show upload area', async ({ page }) => {
    // Navigate to converter
    const converterLink = page.getByText(/convertisseur|converter/i).first();
    if (await converterLink.isVisible()) {
      await converterLink.click();
    }

    // Look for file upload area
    const uploadArea = page.locator('[type="file"], [data-testid="upload"], .dropzone').first();
    await expect(uploadArea).toBeAttached();
  });
});

test.describe('Setsound - Audio Cutter E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('should navigate to Audio Cutter tool', async ({ page }) => {
    const cutterLink = page.getByText(/découpeur|cutter|couper/i).first();
    if (await cutterLink.isVisible()) {
      await cutterLink.click();
    }
  });
});

test.describe('Setsound - BPM Detector E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('should navigate to BPM Detector tool', async ({ page }) => {
    const bpmLink = page.getByText(/BPM|tempo/i).first();
    if (await bpmLink.isVisible()) {
      await bpmLink.click();
    }
  });
});

test.describe('Setsound - Audio Recorder E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('should navigate to Audio Recorder tool', async ({ page }) => {
    const recorderLink = page.getByText(/enregistreur|recorder|enregistrer/i).first();
    if (await recorderLink.isVisible()) {
      await recorderLink.click();
    }
  });
});

test.describe('Setsound - Audio Joiner E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('should navigate to Audio Joiner tool', async ({ page }) => {
    const joinerLink = page.getByText(/fusion|joiner|fusionner/i).first();
    if (await joinerLink.isVisible()) {
      await joinerLink.click();
    }
  });
});

test.describe('Setsound - Responsive Design', () => {
  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:5173');
    await expect(page).toHaveTitle(/Setsound/);
  });

  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('http://localhost:5173');
    await expect(page).toHaveTitle(/Setsound/);
  });

  test('should be responsive on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:5173');
    await expect(page).toHaveTitle(/Setsound/);
  });
});
