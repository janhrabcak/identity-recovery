import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { execFileSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const builderUrl = 'file://' + path.join(rootDir, 'tools', 'builder.html');
const tempDir = path.join(rootDir, 'temp-demo');
const outGifPath = path.join(rootDir, 'docs', 'demo.gif'); // Save to docs/demo.gif

if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

async function createDemo() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1024, height: 768 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: tempDir,
      size: { width: 1024, height: 768 }
    }
  });
  const page = await context.newPage();

  console.log('Loading builder...');
  await page.goto(builderUrl);
  
  // Custom cursor for demo
  await page.evaluate(() => {
    const cursor = document.createElement('div');
    cursor.id = 'demo-cursor';
    cursor.style.width = '24px';
    cursor.style.height = '24px';
    cursor.style.background = 'rgba(255, 60, 60, 0.6)';
    cursor.style.border = '2px solid rgba(255, 0, 0, 0.8)';
    cursor.style.borderRadius = '50%';
    cursor.style.position = 'fixed';
    cursor.style.top = '100px';
    cursor.style.left = '100px';
    cursor.style.pointerEvents = 'none';
    cursor.style.zIndex = '999999';
    cursor.style.transition = 'top 0.4s ease, left 0.4s ease';
    document.body.appendChild(cursor);
    window.moveCursor = (x, y) => {
      cursor.style.left = (x - 12) + 'px';
      cursor.style.top = (y - 12) + 'px';
    };
    window.clickCursor = () => {
      cursor.style.transform = 'scale(0.8)';
      cursor.style.background = 'rgba(255, 60, 60, 0.9)';
      setTimeout(() => {
        cursor.style.transform = 'scale(1)';
        cursor.style.background = 'rgba(255, 60, 60, 0.6)';
      }, 150);
    };
  });

  async function moveTo(selector) {
    const box = await page.locator(selector).boundingBox();
    if (box) {
      await page.evaluate(({x, y}) => window.moveCursor(x, y), { x: box.x + box.width/2, y: box.y + box.height/2 });
      await page.waitForTimeout(500);
    }
  }

  async function clickAt(selector) {
    await moveTo(selector);
    await page.evaluate(() => window.clickCursor());
    await page.waitForTimeout(100);
    await page.click(selector);
  }

  await page.waitForTimeout(1000);

  // Click load sample
  console.log('Clicking load sample...');
  await clickAt('#btn-load-sample');
  await page.waitForTimeout(800);

  // Scroll down to cards section
  await page.mouse.wheel(0, 320);
  await page.waitForTimeout(600);

  // Add a Seed Phrase card to showcase modular capability
  console.log('Adding Seed Phrase card...');
  await clickAt('#btn-add-seed');
  await page.waitForTimeout(600);

  // Fill in seed phrase in the newly added card
  const seedTextareas = page.locator('.seed-textarea');
  const count = await seedTextareas.count();
  if (count > 0) {
    await seedTextareas.nth(count - 1).fill('witch collapse practice feed shame open despair creek road again ice least');
  }
  await page.waitForTimeout(800);

  // Generate diceware instead of typing
  console.log('Generating diceware...');
  await clickAt('#btn-generate-diceware');
  await page.waitForTimeout(1000);

  // Click build vault
  console.log('Building vault...');
  // Scroll to bottom
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(600);
  
  await clickAt('#btn-build-vault');
  
  // Wait for build
  await page.waitForSelector('#view-deploy', { state: 'visible' });
  await page.waitForTimeout(1200);
  
  // Show git tab
  await clickAt('#tab-git-btn');
  await page.waitForTimeout(1200);
  
  // Move to download button to highlight it
  await moveTo('#btn-download-html');
  await page.waitForTimeout(1800);

  console.log('Closing browser...');
  await page.close();
  await context.close();
  await browser.close();

  // Find webm file
  const files = fs.readdirSync(tempDir);
  const webmFile = files.find(f => f.endsWith('.webm'));
  if (!webmFile) throw new Error('Video file not found');
  
  const videoPath = path.join(tempDir, webmFile);
  
  console.log('Converting to GIF using ffmpeg...');
  // Use palette filter to make the GIF high quality
  execFileSync(ffmpegPath, [
    '-y',
    '-i', videoPath,
    '-vf', 'fps=12,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5',
    '-loop', '0',
    outGifPath
  ]);
  
  console.log(`Demo GIF generated at ${outGifPath}`);
  
  // Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });
}

createDemo().catch(console.error);
