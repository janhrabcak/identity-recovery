#!/usr/bin/env node
/**
 * Site Builder for idrecoverykit.com
 * Synchronizes tools/builder.html into site/app/index.html and ensures edge security headers.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const SITE_DIR = path.join(REPO_ROOT, 'site');
const SITE_APP_DIR = path.join(SITE_DIR, 'app');
const BUILDER_SRC = path.join(REPO_ROOT, 'tools', 'builder.html');
const SITE_APP_INDEX = path.join(SITE_APP_DIR, 'index.html');

const DOCS_DIR = path.join(REPO_ROOT, 'docs');
const DOCS_APP_DIR = path.join(DOCS_DIR, 'app');

// Ensure site/, site/app/, and docs/app/ exist
fs.mkdirSync(SITE_APP_DIR, { recursive: true });
fs.mkdirSync(DOCS_APP_DIR, { recursive: true });

// Copy builder.html to site/app/index.html and docs/app/index.html
if (fs.existsSync(BUILDER_SRC)) {
  fs.copyFileSync(BUILDER_SRC, SITE_APP_INDEX);
  console.log(`✓ Synchronized tools/builder.html -> site/app/index.html (${(fs.statSync(SITE_APP_INDEX).size / 1024).toFixed(1)} KB)`);
  
  const docsAppIndex = path.join(DOCS_APP_DIR, 'index.html');
  fs.copyFileSync(BUILDER_SRC, docsAppIndex);
  console.log(`✓ Synchronized tools/builder.html -> docs/app/index.html (${(fs.statSync(docsAppIndex).size / 1024).toFixed(1)} KB)`);
} else {
  console.error(`Error: ${BUILDER_SRC} not found. Run scripts/build-builder.js first.`);
  process.exit(1);
}

// Stamp current release date into site/index.html and copy to docs/index.html
const SITE_INDEX = path.join(SITE_DIR, 'index.html');
const DOCS_INDEX = path.join(DOCS_DIR, 'index.html');
if (fs.existsSync(SITE_INDEX)) {
  const currentDateStr = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  let siteContent = fs.readFileSync(SITE_INDEX, 'utf8');
  if (siteContent.includes('id="protocol-updated-date"')) {
    siteContent = siteContent.replace(
      /<span id="protocol-updated-date">[^<]*<\/span>/,
      `<span id="protocol-updated-date">${currentDateStr}</span>`
    );
    fs.writeFileSync(SITE_INDEX, siteContent, 'utf8');
  }
  fs.copyFileSync(SITE_INDEX, DOCS_INDEX);
  console.log(`✓ Stamped build date (${currentDateStr}) & synchronized site/index.html -> docs/index.html`);
}

// Synchronize PWA, branding, and AI agent discovery assets
const staticAssets = [
  'manifest.json',
  'sw.js',
  'icon-192.png',
  'icon-512.png',
  'social-preview.png',
  'robots.txt',
  'sitemap.xml',
  'llms.txt',
  'llms-full.txt'
];
for (const asset of staticAssets) {
  const src = path.join(SITE_DIR, asset);
  const dest = path.join(DOCS_DIR, asset);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

// Synchronize machine-readable schemas
const SITE_SCHEMA_DIR = path.join(SITE_DIR, 'schema');
const DOCS_SCHEMA_DIR = path.join(DOCS_DIR, 'schema');
if (fs.existsSync(SITE_SCHEMA_DIR)) {
  fs.mkdirSync(DOCS_SCHEMA_DIR, { recursive: true });
  for (const file of fs.readdirSync(SITE_SCHEMA_DIR)) {
    fs.copyFileSync(path.join(SITE_SCHEMA_DIR, file), path.join(DOCS_SCHEMA_DIR, file));
  }
}
console.log('✓ Synchronized PWA, manifest, branding, and AI agent context assets (llms.txt, robots.txt, sitemap.xml, schema/) to docs/');

import { generateAllConfigs } from './providers/index.js';

// Generate edge security and redirect configurations via modular hosting providers
generateAllConfigs(SITE_DIR, { hasApp: true, domain: 'idrecoverykit.com' });
generateAllConfigs(DOCS_DIR, { hasApp: true, domain: 'idrecoverykit.com' });
console.log('✓ Generated multi-provider edge configs (Cloudflare, Netlify, Vercel, GitHub Pages)');

