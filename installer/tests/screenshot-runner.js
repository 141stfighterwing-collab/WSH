/**
 * Standalone Screenshot Runner
 * ============================
 * Captures screenshots of the WSH application without running full tests.
 * Useful for quick visual verification or debugging.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const OUTPUT_DIR = path.join(__dirname, '..', 'screenshots', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19));
const TEST_USER = {
  email: process.env.ADMIN_EMAIL || 'admin@wsh.local',
  password: process.env.ADMIN_PASSWORD || 'admin123'
};

// Pages to capture
const PAGES = [
  { name: 'homepage', url: '/' },
  { name: 'login', url: '/login' },
  { name: 'dashboard', url: '/dashboard', requireAuth: true },
  { name: 'notes', url: '/notes', requireAuth: true },
  { name: 'folders', url: '/folders', requireAuth: true },
  { name: 'settings', url: '/settings', requireAuth: true },
  { name: 'error-404', url: '/non-existent-page' }
];

async function captureScreenshots() {
  console.log('========================================');
  console.log('WSH Screenshot Capture Tool');
  console.log('========================================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log('========================================\n');

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();

  try {
    // Login first for authenticated pages
    console.log('🔐 Attempting login...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    
    const emailInput = await page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = await page.locator('input[type="password"]').first();
    const loginButton = await page.locator('button[type="submit"], button:has-text("Login")').first();
    
    await emailInput.fill(TEST_USER.email);
    await passwordInput.fill(TEST_USER.password);
    await loginButton.click();
    
    await page.waitForLoadState('networkidle').catch(() => {});
    console.log('✅ Login completed\n');

    // Capture each page
    for (const pageInfo of PAGES) {
      console.log(`📸 Capturing: ${pageInfo.name}`);
      
      try {
        await page.goto(`${BASE_URL}${pageInfo.url}`, { 
          waitUntil: 'networkidle',
          timeout: 30000 
        });
        
        await page.waitForTimeout(1000);
        
        const screenshotPath = path.join(OUTPUT_DIR, `${pageInfo.name}.png`);
        await page.screenshot({ 
          path: screenshotPath, 
          fullPage: true 
        });
        
        console.log(`   Saved: ${screenshotPath}`);
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        
        // Capture error state
        const errorPath = path.join(OUTPUT_DIR, `${pageInfo.name}-error.png`);
        await page.screenshot({ path: errorPath, fullPage: true }).catch(() => {});
      }
    }

    // Capture mobile views
    console.log('\n📱 Capturing mobile views...');
    await page.setViewportSize({ width: 375, height: 667 });
    
    for (const pageInfo of ['homepage', 'login', 'dashboard']) {
      try {
        await page.goto(`${BASE_URL}${PAGES.find(p => p.name === pageInfo)?.url || '/'}`, { 
          waitUntil: 'networkidle' 
        });
        
        const screenshotPath = path.join(OUTPUT_DIR, `${pageInfo}-mobile.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`   Saved: ${screenshotPath}`);
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    console.log('\n========================================');
    console.log('Screenshot capture complete!');
    console.log(`Total screenshots: ${fs.readdirSync(OUTPUT_DIR).length}`);
    console.log(`Location: ${OUTPUT_DIR}`);
    console.log('========================================');

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  } finally {
    await browser.close();
  }
}

// Run if called directly
if (require.main === module) {
  captureScreenshots().catch(console.error);
}

module.exports = { captureScreenshots };
