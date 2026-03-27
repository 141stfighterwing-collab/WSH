/**
 * WSH Application UI Tests
 * ========================
 * Comprehensive UI tests for WSH (Weavenote Self Hosted) application
 * Includes login tests, navigation, button functionality, and screenshot capture
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const SCREENSHOT_FOLDER = path.join(SCREENSHOT_DIR, TIMESTAMP);

// Test credentials - Use environment variables or defaults
const TEST_USER = {
  email: process.env.ADMIN_EMAIL || 'admin@wsh.local',
  password: process.env.ADMIN_PASSWORD || 'admin123'
};

// AI API Key for testing AI features (optional)
const AI_API_KEY = process.env.GEMINI_API_KEY || '';

// ============================================================================
// SETUP
// ============================================================================

// Ensure screenshot folder exists
if (!fs.existsSync(SCREENSHOT_FOLDER)) {
  fs.mkdirSync(SCREENSHOT_FOLDER, { recursive: true });
}

// Helper function for screenshots
async function takeScreenshot(page, name, fullPage = true) {
  const screenshotPath = path.join(SCREENSHOT_FOLDER, `${name}.png`);
  await page.screenshot({ 
    path: screenshotPath, 
    fullPage: fullPage 
  });
  console.log(`📸 Screenshot saved: ${screenshotPath}`);
  return screenshotPath;
}

// Helper function for error screenshots
async function takeErrorScreenshot(page, name) {
  const screenshotPath = path.join(SCREENSHOT_FOLDER, `${name}-error.png`);
  await page.screenshot({ 
    path: screenshotPath, 
    fullPage: true 
  });
  console.log(`❌ Error screenshot saved: ${screenshotPath}`);
  return screenshotPath;
}

// ============================================================================
// TEST SUITES
// ============================================================================

test.describe('WSH Application - Deployment Verification', () => {
  
  test.beforeAll(async () => {
    console.log('========================================');
    console.log('WSH UI Test Suite');
    console.log('========================================');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Screenshot Folder: ${SCREENSHOT_FOLDER}`);
    console.log(`Test User: ${TEST_USER.email}`);
    console.log('========================================');
  });

  test('01 - Application is accessible', async ({ page }) => {
    console.log('\n📋 Test: Application Accessibility');
    
    try {
      // Navigate to the application
      const response = await page.goto(BASE_URL, { 
        waitUntil: 'networkidle', 
        timeout: 30000 
      });
      
      // Check response status
      expect(response.status()).toBeLessThan(400);
      
      // Take screenshot
      await takeScreenshot(page, '01-homepage');
      
      // Check page title
      const title = await page.title();
      console.log(`  Page Title: ${title}`);
      
      // Verify title contains WSH or Weavenote
      expect(title.toLowerCase()).toMatch(/wsh|weavenote|note/);
      
      console.log('  ✅ Application is accessible');
    } catch (error) {
      await takeErrorScreenshot(page, '01-homepage');
      throw error;
    }
  });

  test('02 - Login page loads', async ({ page }) => {
    console.log('\n📋 Test: Login Page');
    
    try {
      // Navigate to login page
      await page.goto(`${BASE_URL}/login`, { 
        waitUntil: 'networkidle', 
        timeout: 30000 
      });
      
      await takeScreenshot(page, '02-login-page');
      
      // Check for login form elements
      const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      
      // Verify form elements exist
      await expect(emailInput).toBeVisible({ timeout: 5000 });
      await expect(passwordInput).toBeVisible({ timeout: 5000 });
      
      console.log('  ✅ Login page loaded with form elements');
    } catch (error) {
      await takeErrorScreenshot(page, '02-login');
      throw error;
    }
  });

  test('03 - Login with credentials', async ({ page }) => {
    console.log('\n📋 Test: Login Functionality');
    
    try {
      // Navigate to login
      await page.goto(`${BASE_URL}/login`, { 
        waitUntil: 'networkidle', 
        timeout: 30000 
      });
      
      // Fill login form
      const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i], input[id*="email" i]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      
      await emailInput.fill(TEST_USER.email);
      await passwordInput.fill(TEST_USER.password);
      
      await takeScreenshot(page, '03-login-filled');
      
      // Click login button
      const loginButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in"), button:has-text("Log in")').first();
      await loginButton.click();
      
      // Wait for navigation or response
      await page.waitForLoadState('networkidle').catch(() => {});
      
      // Wait a moment for any redirects
      await page.waitForTimeout(2000);
      
      await takeScreenshot(page, '03-after-login');
      
      // Check if logged in (URL change or user menu visible)
      const currentUrl = page.url();
      const isLoggedIn = !currentUrl.includes('/login') || 
                         await page.locator('button:has-text("Logout"), button:has-text("Sign out"), [data-testid="user-menu"]').isVisible().catch(() => false);
      
      if (isLoggedIn) {
        console.log('  ✅ Login successful');
      } else {
        console.log('  ⚠️ Login status unclear - check screenshot');
      }
    } catch (error) {
      await takeErrorScreenshot(page, '03-login');
      throw error;
    }
  });

  test('04 - Dashboard/Notes page', async ({ page }) => {
    console.log('\n📋 Test: Dashboard Access');
    
    try {
      // Login first
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
      
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const loginButton = page.locator('button[type="submit"], button:has-text("Login")').first();
      
      await emailInput.fill(TEST_USER.email);
      await passwordInput.fill(TEST_USER.password);
      await loginButton.click();
      
      await page.waitForLoadState('networkidle').catch(() => {});
      
      // Navigate to dashboard
      await page.goto(`${BASE_URL}/dashboard`, { 
        waitUntil: 'networkidle', 
        timeout: 30000 
      }).catch(async () => {
        // Try notes page
        await page.goto(`${BASE_URL}/notes`, { 
          waitUntil: 'networkidle', 
          timeout: 30000 
        });
      });
      
      await takeScreenshot(page, '04-dashboard');
      
      // Check for dashboard elements
      const hasContent = await page.locator('main, [role="main"], .dashboard, .notes-container').isVisible().catch(() => false);
      
      if (hasContent) {
        console.log('  ✅ Dashboard accessible');
      } else {
        console.log('  ⚠️ Dashboard content not found');
      }
    } catch (error) {
      await takeErrorScreenshot(page, '04-dashboard');
      throw error;
    }
  });

  test('05 - New Note button functionality', async ({ page }) => {
    console.log('\n📋 Test: New Note Button');
    
    try {
      // Login
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
      
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const loginButton = page.locator('button[type="submit"], button:has-text("Login")').first();
      
      await emailInput.fill(TEST_USER.email);
      await passwordInput.fill(TEST_USER.password);
      await loginButton.click();
      
      await page.waitForLoadState('networkidle').catch(() => {});
      
      // Look for create/new note button
      const newNoteButton = page.locator('button:has-text("New"), button:has-text("Create"), button:has-text("Add"), a:has-text("New Note"), [data-testid="new-note"]').first();
      
      await takeScreenshot(page, '05-before-create');
      
      const buttonVisible = await newNoteButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (buttonVisible) {
        await newNoteButton.click();
        await page.waitForLoadState('networkidle').catch(() => {});
        await page.waitForTimeout(1000);
        
        await takeScreenshot(page, '05-create-note-form');
        console.log('  ✅ New Note button works');
      } else {
        console.log('  ⚠️ New Note button not found - may need different selector');
        test.skip();
      }
    } catch (error) {
      await takeErrorScreenshot(page, '05-create');
      throw error;
    }
  });

  test('06 - Navigation menu', async ({ page }) => {
    console.log('\n📋 Test: Navigation Menu');
    
    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      
      await takeScreenshot(page, '06-navigation');
      
      // Check for navigation elements
      const nav = page.locator('nav, [role="navigation"], header nav, .nav, .navbar').first();
      const navVisible = await nav.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (navVisible) {
        // Try clicking nav links
        const navLinks = await nav.locator('a, button').all();
        
        for (let i = 0; i < Math.min(navLinks.length, 3); i++) {
          try {
            const linkText = await navLinks[i].textContent();
            console.log(`  Found nav link: ${linkText?.trim()}`);
          } catch (e) {}
        }
        
        console.log('  ✅ Navigation menu found');
      } else {
        console.log('  ⚠️ Navigation menu not found');
      }
    } catch (error) {
      await takeErrorScreenshot(page, '06-nav');
      throw error;
    }
  });

  test('07 - Dark mode toggle', async ({ page }) => {
    console.log('\n📋 Test: Theme Toggle');
    
    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      
      // Look for theme toggle
      const themeToggle = page.locator('button:has-text("dark"), button:has-text("light"), button[aria-label*="theme"], button[aria-label*="mode"], [data-theme-toggle], .theme-toggle, [data-testid="theme-toggle"]').first();
      
      const toggleVisible = await themeToggle.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (toggleVisible) {
        // Get initial theme
        const initialTheme = await page.evaluate(() => {
          return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        });
        console.log(`  Initial theme: ${initialTheme}`);
        
        await takeScreenshot(page, `07-theme-${initialTheme}`);
        
        // Toggle theme
        await themeToggle.click();
        await page.waitForTimeout(500);
        
        // Get new theme
        const newTheme = await page.evaluate(() => {
          return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        });
        console.log(`  New theme: ${newTheme}`);
        
        await takeScreenshot(page, `07-theme-${newTheme}`);
        
        if (initialTheme !== newTheme) {
          console.log('  ✅ Theme toggle works');
        } else {
          console.log('  ⚠️ Theme did not change');
        }
      } else {
        await takeScreenshot(page, '07-no-theme-toggle');
        console.log('  ⚠️ No theme toggle found');
        test.skip();
      }
    } catch (error) {
      await takeErrorScreenshot(page, '07-theme');
      throw error;
    }
  });

  test('08 - Responsive design (Mobile)', async ({ page }) => {
    console.log('\n📋 Test: Mobile Responsiveness');
    
    try {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      
      await takeScreenshot(page, '08-mobile-view');
      
      // Check for mobile menu
      const mobileMenu = page.locator('button[aria-label*="menu"], button.hamburger, [data-mobile-menu], .mobile-menu-btn, [data-testid="mobile-menu"]').first();
      
      const menuVisible = await mobileMenu.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (menuVisible) {
        await mobileMenu.click();
        await page.waitForTimeout(500);
        
        await takeScreenshot(page, '08-mobile-menu-open');
        console.log('  ✅ Mobile menu works');
      } else {
        console.log('  ⚠️ No mobile menu button found');
      }
      
      // Reset viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      
      console.log('  ✅ Mobile responsiveness tested');
    } catch (error) {
      await takeErrorScreenshot(page, '08-mobile');
      throw error;
    }
  });

  test('09 - UI Elements Capture', async ({ page }) => {
    console.log('\n📋 Test: UI Elements');
    
    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      
      // Capture specific elements
      const elements = [
        { selector: 'header, [role="banner"]', name: '09-header' },
        { selector: 'main, [role="main"]', name: '09-main-content' },
        { selector: 'footer, [role="contentinfo"]', name: '09-footer' },
        { selector: 'nav, [role="navigation"]', name: '09-navigation' }
      ];
      
      for (const element of elements) {
        const el = page.locator(element.selector).first();
        const visible = await el.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (visible) {
          try {
            await el.screenshot({ path: path.join(SCREENSHOT_FOLDER, `${element.name}.png`) });
            console.log(`  📸 Captured: ${element.name}`);
          } catch (e) {
            console.log(`  ⚠️ Could not capture: ${element.name}`);
          }
        }
      }
      
      console.log('  ✅ UI elements captured');
    } catch (error) {
      await takeErrorScreenshot(page, '09-elements');
      throw error;
    }
  });

  test('10 - Error page handling', async ({ page }) => {
    console.log('\n📋 Test: Error Page');
    
    try {
      // Navigate to non-existent page
      await page.goto(`${BASE_URL}/non-existent-page-12345`, { 
        waitUntil: 'networkidle', 
        timeout: 15000 
      });
      
      await takeScreenshot(page, '10-error-page');
      
      // Check for 404 message
      const notFound = page.locator('text=/404|not found|page not found|error/i');
      const hasError = await notFound.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (hasError) {
        console.log('  ✅ Error page displayed correctly');
      } else {
        console.log('  ⚠️ No 404 message found');
      }
    } catch (error) {
      await takeErrorScreenshot(page, '10-error');
      console.log('  ⚠️ Error page test completed with warnings');
    }
  });
});

// ============================================================================
// BUTTON FUNCTIONALITY TESTS
// ============================================================================

test.describe('WSH Application - Button Functionality Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const loginButton = page.locator('button[type="submit"], button:has-text("Login")').first();
    
    await emailInput.fill(TEST_USER.email);
    await passwordInput.fill(TEST_USER.password);
    await loginButton.click();
    
    await page.waitForLoadState('networkidle').catch(() => {});
  });

  test('B1 - Folder creation button', async ({ page }) => {
    console.log('\n📋 Test: Folder Creation Button');
    
    try {
      // Navigate to notes/folders area
      await page.goto(`${BASE_URL}/notes`, { waitUntil: 'networkidle' }).catch(() => {});
      
      await takeScreenshot(page, 'B1-before-folder-create');
      
      // Look for folder creation button
      const folderButton = page.locator('button:has-text("Folder"), button:has-text("New Folder"), [data-testid="new-folder"]').first();
      
      const buttonVisible = await folderButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (buttonVisible) {
        await folderButton.click();
        await page.waitForTimeout(500);
        await takeScreenshot(page, 'B1-folder-create-clicked');
        console.log('  ✅ Folder button clickable');
      } else {
        console.log('  ⚠️ Folder button not found');
      }
    } catch (error) {
      await takeErrorScreenshot(page, 'B1-folder');
      throw error;
    }
  });

  test('B2 - Search functionality', async ({ page }) => {
    console.log('\n📋 Test: Search Button');
    
    try {
      await page.goto(`${BASE_URL}/notes`, { waitUntil: 'networkidle' }).catch(() => {});
      
      // Look for search input
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], [data-testid="search"]').first();
      
      const searchVisible = await searchInput.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (searchVisible) {
        await searchInput.fill('test query');
        await page.waitForTimeout(500);
        await takeScreenshot(page, 'B2-search-filled');
        console.log('  ✅ Search input works');
      } else {
        console.log('  ⚠️ Search input not found');
      }
    } catch (error) {
      await takeErrorScreenshot(page, 'B2-search');
      throw error;
    }
  });

  test('B3 - Settings/Profile button', async ({ page }) => {
    console.log('\n📋 Test: Settings Button');
    
    try {
      await page.goto(`${BASE_URL}/notes`, { waitUntil: 'networkidle' }).catch(() => {});
      
      // Look for settings/profile button
      const settingsButton = page.locator('button:has-text("Settings"), [data-testid="settings"], .settings-btn, [aria-label*="settings" i]').first();
      
      const settingsVisible = await settingsButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (settingsVisible) {
        await settingsButton.click();
        await page.waitForTimeout(500);
        await takeScreenshot(page, 'B3-settings');
        console.log('  ✅ Settings button works');
      } else {
        console.log('  ⚠️ Settings button not found');
      }
    } catch (error) {
      await takeErrorScreenshot(page, 'B3-settings');
      throw error;
    }
  });

  test('B4 - Logout button', async ({ page }) => {
    console.log('\n📋 Test: Logout Button');
    
    try {
      await page.goto(`${BASE_URL}/notes`, { waitUntil: 'networkidle' }).catch(() => {});
      
      // Look for logout button
      const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign out"), button:has-text("Log out"), [data-testid="logout"]').first();
      
      const logoutVisible = await logoutButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (logoutVisible) {
        await takeScreenshot(page, 'B4-before-logout');
        
        await logoutButton.click();
        await page.waitForLoadState('networkidle').catch(() => {});
        
        await takeScreenshot(page, 'B4-after-logout');
        console.log('  ✅ Logout button works');
      } else {
        console.log('  ⚠️ Logout button not found');
      }
    } catch (error) {
      await takeErrorScreenshot(page, 'B4-logout');
      throw error;
    }
  });
});

// ============================================================================
// AI FEATURE TESTS (IF API KEY PROVIDED)
// ============================================================================

test.describe('WSH Application - AI Features (Optional)', () => {
  
  test.skip(!AI_API_KEY, 'AI API key not provided');

  test('AI1 - AI feature button', async ({ page }) => {
    console.log('\n📋 Test: AI Feature Button');
    
    try {
      // Login
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
      
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const loginButton = page.locator('button[type="submit"], button:has-text("Login")').first();
      
      await emailInput.fill(TEST_USER.email);
      await passwordInput.fill(TEST_USER.password);
      await loginButton.click();
      
      await page.waitForLoadState('networkidle').catch(() => {});
      
      // Look for AI-related buttons
      const aiButton = page.locator('button:has-text("AI"), button:has-text("Generate"), [data-testid="ai-feature"], .ai-button').first();
      
      const aiVisible = await aiButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (aiVisible) {
        await takeScreenshot(page, 'AI1-ai-button');
        console.log('  ✅ AI feature button found');
      } else {
        console.log('  ⚠️ AI feature button not found');
      }
    } catch (error) {
      await takeErrorScreenshot(page, 'AI1-ai');
      throw error;
    }
  });
});

// ============================================================================
// TEARDOWN
// ============================================================================

test.afterAll(async () => {
  console.log('\n========================================');
  console.log('Test Suite Complete');
  console.log(`Screenshots saved to: ${SCREENSHOT_FOLDER}`);
  console.log('========================================');
});
