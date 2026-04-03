const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000)); // wait for hydration
  
  await page.screenshot({ path: '/home/z/my-project/download/screenshot-fix-01-home.png', fullPage: false });
  
  // Get page title for verification
  const title = await page.title();
  console.log('Page title:', title);
  console.log('Screenshot saved');
  
  await browser.close();
})();
