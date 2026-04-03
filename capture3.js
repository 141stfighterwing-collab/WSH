const { spawn } = require('child_process');
const http = require('http');

async function waitUntilReady(port, maxWait = 20000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    try {
      const res = await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${port}/`, (res) => {
          res.resume();
          resolve(res);
        });
        req.on('error', reject);
        req.setTimeout(3000, () => { req.destroy(); reject(new Error('timeout')); });
      });
      if (res.statusCode === 200) return;
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Server never ready');
}

async function main() {
  const server = spawn('node', ['.next/standalone/server.js'], {
    env: { ...process.env, PORT: '3789' },
    cwd: '/home/z/my-project',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stdout.on('data', d => process.stderr.write(d));
  server.stderr.on('data', d => process.stderr.write(d));
  
  try {
    await waitUntilReady(3789);
    console.log('Server ready');
    
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3789', { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));
    
    // Check if right sidebar exists in DOM
    const rightSidebar = await page.$('aside');
    const asideCount = await page.$$eval('aside', els => els.length);
    console.log(`Number of <aside> elements: ${asideCount}`);
    
    // Get layout boxes
    const layoutInfo = await page.evaluate(() => {
      const body = document.body;
      const main = document.querySelector('main');
      const asides = document.querySelectorAll('aside');
      const header = document.querySelector('header');
      const footer = document.querySelector('footer');
      
      const getRect = (el) => el ? {
        width: el.offsetWidth,
        height: el.offsetHeight,
        top: el.offsetTop,
        left: el.offsetLeft,
        display: getComputedStyle(el).display,
        visibility: getComputedStyle(el).visibility,
        classes: el.className
      } : null;
      
      return {
        body: { width: body.offsetWidth, height: body.offsetHeight },
        header: getRect(header),
        main: getRect(main),
        asides: Array.from(asides).map(a => getRect(a)),
        footer: getRect(footer),
        viewport: { width: window.innerWidth, height: window.innerHeight }
      };
    });
    console.log('Layout info:', JSON.stringify(layoutInfo, null, 2));
    
    // Take screenshot
    await page.screenshot({ path: '/home/z/my-project/download/screenshot-fix-01-home.png', fullPage: false });
    console.log('Screenshot saved');
    
    await browser.close();
    console.log('Done');
  } finally {
    server.kill();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
