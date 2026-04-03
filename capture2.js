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
  // Start server
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
    await new Promise(r => setTimeout(r, 1500));
    
    await page.screenshot({ path: '/home/z/my-project/download/screenshot-fix-01-home.png', fullPage: false });
    console.log('Screenshot saved');
    
    await browser.close();
    console.log('Done');
  } finally {
    server.kill();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
