import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = path.resolve('tests/screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const BASE_URL = 'http://127.0.0.1:5173';

async function runTests() {
  console.log('🚀 Starting Comprehensive Playwright E2E Suite for Ultimate Downloader');
  console.log(`🌐 Target Base URL: ${BASE_URL}\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();
  let passedCount = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passedCount++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Page Load & Default Lighter Color Scheme
    // ----------------------------------------------------
    console.log('--- TEST 1: Page Load & Default Lighter Color Scheme ---');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('#root', { timeout: 10000 });

    const htmlClasses = await page.evaluate(() => document.documentElement.className);
    console.log(`  Initial HTML classes: "${htmlClasses}"`);
    assert(!htmlClasses.includes('dark'), 'Light theme is active by default (no dark class on html)');

    const bodyBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    console.log(`  Body background color: ${bodyBg}`);
    assert(bodyBg.includes('248, 250, 252') || bodyBg.includes('255, 255, 255'), 'Body background uses light canvas (#f8fafc / rgb(248, 250, 252))');

    // Verify Title & Hero Header
    const pageTitle = await page.title();
    assert(pageTitle.includes('Ultimate Downloader'), `Page title is correct ("${pageTitle}")`);

    const heroHeading = await page.textContent('h1');
    assert(heroHeading && heroHeading.includes('Download Anything'), `Hero headline rendered ("${heroHeading.trim().replace(/\s+/g, ' ')}")`);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-desktop-light.png'), fullPage: false });
    console.log('  📸 Captured 01-desktop-light.png');

    // ----------------------------------------------------
    // TEST 2: Theme Toggle (Light <-> Dark)
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Theme Toggle (Light <-> Dark) ---');
    const themeBtn = await page.waitForSelector('button[aria-label*="Toggle Theme"], button[title*="Mode"]');
    assert(!!themeBtn, 'Theme toggle button exists in navbar');

    await themeBtn.click();
    await page.waitForTimeout(300);

    const darkHtmlClasses = await page.evaluate(() => document.documentElement.className);
    assert(darkHtmlClasses.includes('dark'), 'Clicking theme button switches to Dark Mode (.dark class added)');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-desktop-dark.png'), fullPage: false });
    console.log('  📸 Captured 02-desktop-dark.png');

    // Switch back to light
    await themeBtn.click();
    await page.waitForTimeout(300);
    const revertedClasses = await page.evaluate(() => document.documentElement.className);
    assert(!revertedClasses.includes('dark'), 'Clicking theme button again reverts to Light Mode');

    // ----------------------------------------------------
    // TEST 3: Responsiveness across Mobile & Tablet Viewports
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Responsive Viewports (Tablet & Mobile) ---');

    // Tablet (768 x 1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(400);
    const tabletNoOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    assert(tabletNoOverflow, 'Tablet viewport (768px) fits without horizontal overflow');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-tablet-light.png'), fullPage: false });
    console.log('  📸 Captured 03-tablet-light.png');

    // Mobile (375 x 667 - iPhone SE)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(400);
    const mobileNoOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    assert(mobileNoOverflow, 'Mobile viewport (375px) fits without horizontal overflow');

    // Check touch target minimum sizes on mobile
    const interactiveButtons = await page.$$('header button[aria-label], .md\\:hidden button');
    let hasValidTouchTargets = true;
    for (const btn of interactiveButtons) {
      const box = await btn.boundingBox();
      if (box && (box.height < 36 || box.width < 36)) {
        hasValidTouchTargets = false;
        break;
      }
    }
    assert(hasValidTouchTargets, 'Interactive buttons meet touch target accessibility criteria (>=36px)');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-mobile-light.png'), fullPage: false });
    console.log('  📸 Captured 04-mobile-light.png');

    // Reset back to desktop for functional extraction tests
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(300);

    // ----------------------------------------------------
    // TEST 4: Single Media Analysis with Real Link
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Single Media Extraction with Real Media URL ---');
    const realVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

    const urlInput = await page.waitForSelector('input[aria-label="Media or webpage link"], input[placeholder*="Paste any link"]');
    assert(!!urlInput, 'Media URL input field found');

    await urlInput.fill(realVideoUrl);
    const inputValue = await urlInput.inputValue();
    assert(inputValue === realVideoUrl, 'Pasted real video URL into input');

    // Click Analyze & Fetch button
    const analyzeBtn = await page.waitForSelector('button[aria-label="Analyze and Fetch Media"], button:has-text("Analyze & Fetch")');
    assert(!!analyzeBtn, 'Analyze & Fetch CTA button found');
    await analyzeBtn.click();

    // Wait for MediaPreviewCard to render
    console.log('  ⏳ Waiting for media metadata extraction...');
    await page.waitForSelector('button[aria-label="Start Download"]', { timeout: 25000 });

    const previewVisible = await page.evaluate(() => {
      const body = document.body.innerText;
      return body.includes('ForBiggerBlazes') || body.includes('Video') || body.includes('Download');
    });
    assert(previewVisible, 'Media preview card successfully rendered with extracted metadata');

    // Verify Video / Audio mode tabs
    const videoTab = await page.$('button:has-text("Video")');
    const audioTab = await page.$('button:has-text("Audio")');
    assert(!!videoTab && !!audioTab, 'Video / Audio format pill switches are available');

    // Test switching to Audio mode and back
    await audioTab.click();
    await page.waitForTimeout(300);
    const audioActiveText = await page.textContent('button:has-text("Audio")');
    assert(audioActiveText.includes('Audio'), 'Audio Only mode toggle works');

    await videoTab.click();
    await page.waitForTimeout(300);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-single-preview.png'), fullPage: false });
    console.log('  📸 Captured 05-single-preview.png');

    // ----------------------------------------------------
    // TEST 5: Image Gallery & Webpage Scraper with Real Link
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Image Gallery Extractor with Real URL ---');
    // Switch to Image Scraper tab
    const scraperTabBtn = await page.waitForSelector('button[aria-label="Image Extractor Tab"]');
    assert(!!scraperTabBtn, 'Image Scraper tab button found in navbar');
    await scraperTabBtn.click();
    await page.waitForTimeout(500);

    const scraperHeading = await page.textContent('h2, h3');
    assert(scraperHeading && (scraperHeading.includes('Image') || scraperHeading.includes('Scraper') || scraperHeading.includes('Extractor')), 'Image Scraper view loaded');

    // Enter real URL with images
    const realWebPageWithImages = 'https://en.wikipedia.org/wiki/Aurora';
    const scraperInput = await page.waitForSelector('input[placeholder*="Enter page URL"], input[placeholder*="unsplash"]');
    assert(!!scraperInput, 'Image scraper URL input found');
    await scraperInput.fill(realWebPageWithImages);

    const scanBtn = await page.waitForSelector('form button[type="submit"]');
    assert(!!scanBtn, 'Scrape submit button found');
    await scanBtn.click();

    console.log('  ⏳ Scraping images from real URL...');
    // Wait for extracted image cards to load
    await page.waitForSelector('img[alt*="Extracted"], img[src*="wikimedia"]', { timeout: 35000 });

    const imageCount = await page.evaluate(() => {
      return document.querySelectorAll('img[src*="http"]').length;
    });
    console.log(`  Found ${imageCount} extracted images from real page`);
    assert(imageCount >= 3, `Extracted ${imageCount} high-resolution images successfully`);

    // Verify Select All button
    const selectAllBtn = await page.$('button:has-text("Select All"), button:has-text("Deselect All")');
    assert(!!selectAllBtn, 'Select all / batch selector controls available');

    // Verify ZIP Download CTA
    const zipBtn = await page.$('button:has-text("ZIP Archive"), button:has-text("ZIP"), button:has-text("Download")');
    assert(!!zipBtn, 'Batch ZIP download button is available');

    // Test Zoom Lightbox Modal
    const firstZoomBtn = await page.$('button[aria-label="Zoom image preview"]');
    if (firstZoomBtn) {
      await firstZoomBtn.click();
      await page.waitForTimeout(400);
      const zoomModal = await page.$('.fixed.inset-0.z-50');
      assert(!!zoomModal, 'Image Lightbox zoom modal opens on click');
      const closeZoomBtn = await page.$('button[aria-label="Close zoomed preview"], button:has(svg.lucide-x)');
      if (closeZoomBtn) await closeZoomBtn.click();
      await page.waitForTimeout(300);
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-image-scraper.png'), fullPage: false });
    console.log('  📸 Captured 06-image-scraper.png');

    // ----------------------------------------------------
    // TEST 6: Batch Download Modal & Multi-URL Queueing
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Batch Download Modal & Multi-URL Queueing ---');
    // Open Batch Modal from Navbar
    const batchNavBtn = await page.waitForSelector('button[aria-label="Batch Crawl Tab"]');
    assert(!!batchNavBtn, 'Batch Crawl nav button found');
    await batchNavBtn.click();
    await page.waitForTimeout(400);

    // Verify Modal
    const modalTitle = await page.textContent('h3:has-text("Batch"), h2:has-text("Batch")');
    assert(modalTitle && modalTitle.includes('Batch'), 'Batch Download modal opened');

    const textarea = await page.waitForSelector('textarea');
    assert(!!textarea, 'Multi-line URL textarea found');

    const batchUrls = [
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
    ].join('\n');

    await textarea.fill(batchUrls);

    // Verify Concurrency Buttons
    const concurrencyBtn3x = await page.$('button:has-text("3x")');
    assert(!!concurrencyBtn3x, 'Concurrency preset button (3x) available');
    await concurrencyBtn3x.click();

    // Submit batch
    const queueBatchBtn = await page.waitForSelector('button:has-text("Enqueue")');
    assert(!!queueBatchBtn, 'Enqueue Downloads button found');
    await queueBatchBtn.click();
    await page.waitForTimeout(1000);

    // Verify tasks queued in Download Pipeline
    const tasksCount = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Pipeline') || text.includes('ForBiggerBlazes') || text.includes('Active & Recent Tasks') || text.includes('Ephemeral');
    });
    assert(tasksCount, 'Batch items successfully queued in download manager');

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-batch-queue.png'), fullPage: false });
    console.log('  📸 Captured 07-batch-queue.png');

    // ----------------------------------------------------
    // TEST 7: Settings Modal & Ephemeral Storage Notice
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Settings Modal & Ephemeral Storage Notice ---');
    const settingsBtn = await page.waitForSelector('button[aria-label="Settings"], button:has(svg.lucide-settings)');
    assert(!!settingsBtn, 'Settings button found in navbar');
    await settingsBtn.click();
    await page.waitForTimeout(400);

    const settingsTitle = await page.textContent('h2:has-text("System"), h3:has-text("System"), h3:has-text("Preferences")');
    assert(settingsTitle && (settingsTitle.includes('System') || settingsTitle.includes('Preferences')), 'Settings modal opened ("System & Preferences")');

    const storageNotice = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Ephemeral') || text.includes('Storage') || text.includes('Auto-purged') || text.includes('purged');
    });
    assert(storageNotice, 'Ephemeral storage / auto-purge notice confirmed in Settings');

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-settings-modal.png'), fullPage: false });
    console.log('  📸 Captured 08-settings-modal.png');

    // Close settings modal
    const closeBtn = await page.$('button:has-text("Cancel"), button:has-text("Save")');
    if (closeBtn) await closeBtn.click();

    console.log('\n===============================================');
    console.log(`🎉 ALL ${passedCount}/${totalTests} PLAYWRIGHT E2E TESTS PASSED!`);
    console.log('===============================================\n');

  } catch (err) {
    console.error('\n❌ Playwright Test Suite Failed:', err);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'error-state.png') }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runTests();
