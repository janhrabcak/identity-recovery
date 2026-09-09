import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const docsDir = path.join(rootDir, 'docs');
const siteDir = path.join(rootDir, 'site');

async function generate() {
  const browser = await chromium.launch({ headless: true });

  // 1. Social Preview 1280x640
  const page1 = await browser.newPage({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 2 });
  const previewHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1280px;
    height: 640px;
    background: radial-gradient(circle at 50% 20%, #1e293b 0%, #0b0f19 80%);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #f8fafc;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 60px;
    position: relative;
    overflow: hidden;
  }
  .grid-bg {
    position: absolute;
    inset: 0;
    background-image: linear-gradient(to right, rgba(56, 189, 248, 0.05) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(56, 189, 248, 0.05) 1px, transparent 1px);
    background-size: 40px 40px;
    mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);
  }
  .glow {
    position: absolute;
    width: 600px;
    height: 300px;
    background: radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, rgba(6, 182, 212, 0.12) 50%, transparent 75%);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    filter: blur(50px);
    pointer-events: none;
  }
  .content {
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .shield-icon {
    font-size: 5rem;
    margin-bottom: 12px;
    filter: drop-shadow(0 10px 20px rgba(16, 185, 129, 0.35));
  }
  .title {
    font-size: 4.2rem;
    font-weight: 800;
    letter-spacing: -1.5px;
    line-height: 1.1;
    margin-bottom: 16px;
    background: linear-gradient(135deg, #ffffff 40%, #94a3b8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .subtitle {
    font-size: 1.55rem;
    color: #94a3b8;
    max-width: 820px;
    line-height: 1.45;
    margin-bottom: 36px;
    font-weight: 400;
  }
  .badges {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    justify-content: center;
  }
  .badge {
    background: rgba(30, 41, 59, 0.85);
    border: 1px solid rgba(148, 163, 184, 0.2);
    color: #38bdf8;
    padding: 10px 20px;
    border-radius: 9999px;
    font-size: 0.95rem;
    font-weight: 700;
    font-family: ui-monospace, "SF Mono", monospace;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  .badge.green {
    color: #34d399;
    border-color: rgba(52, 211, 153, 0.3);
  }
  .badge.emerald {
    color: #10b981;
    border-color: rgba(16, 185, 129, 0.3);
  }
</style>
</head>
<body>
  <div class="grid-bg"></div>
  <div class="glow"></div>
  <div class="content">
    <div class="shield-icon">🛡️</div>
    <h1 class="title">ID Recovery Kit</h1>
    <p class="subtitle">Stateless, Zero-Hardware Disaster Recovery Protocol for Primary Identities, Master Passwords, Seed Phrases & 2FA</p>
    <div class="badges">
      <div class="badge green">AES-GCM-256</div>
      <div class="badge">PBKDF2 600,000 Rounds</div>
      <div class="badge green">0 Dependencies</div>
      <div class="badge emerald">100% Client-Side</div>
      <div class="badge">RFC 1035 DNS Dead-Drop</div>
    </div>
  </div>
</body>
</html>`;

  await page1.setContent(previewHtml);
  await page1.screenshot({ path: path.join(docsDir, 'social-preview.png') });
  await page1.screenshot({ path: path.join(siteDir, 'social-preview.png') });
  await page1.close();
  console.log('✓ Generated docs/social-preview.png & site/social-preview.png');

  // 2. App Icon 512x512 and 192x192
  const iconPage = await browser.newPage({ viewport: { width: 512, height: 512 } });
  const iconHtml = `<!DOCTYPE html>
<html>
<head>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 512px;
    height: 512px;
    background: #0b0f19;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 96px;
    overflow: hidden;
  }
  .shield {
    font-size: 16rem;
    filter: drop-shadow(0 15px 30px rgba(16, 185, 129, 0.5));
  }
</style>
</head>
<body>
  <div class="shield">🛡️</div>
</body>
</html>`;

  await iconPage.setContent(iconHtml);
  await iconPage.screenshot({ path: path.join(docsDir, 'icon-512.png') });
  await iconPage.screenshot({ path: path.join(siteDir, 'icon-512.png') });
  await iconPage.setViewportSize({ width: 192, height: 192 });
  await iconPage.screenshot({ path: path.join(docsDir, 'icon-192.png') });
  await iconPage.screenshot({ path: path.join(siteDir, 'icon-192.png') });
  await iconPage.close();
  console.log('✓ Generated icon-192.png & icon-512.png in docs/ and site/');

  await browser.close();
}

generate().catch(console.error);
