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

// Ensure site/ and site/app/ exist
fs.mkdirSync(SITE_APP_DIR, { recursive: true });

// Copy builder.html to site/app/index.html
if (fs.existsSync(BUILDER_SRC)) {
  fs.copyFileSync(BUILDER_SRC, SITE_APP_INDEX);
  console.log(`✓ Synchronized tools/builder.html -> site/app/index.html (${(fs.statSync(SITE_APP_INDEX).size / 1024).toFixed(1)} KB)`);
} else {
  console.error(`Error: ${BUILDER_SRC} not found. Run scripts/build-builder.js first.`);
  process.exit(1);
}

// Generate site/_headers for Cloudflare / Netlify edge security
const headersContent = `/*
  Content-Security-Policy: default-src 'none'; connect-src https://cloudflare-dns.com https://dns.google; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: https:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none';
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=(), usb=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  Cache-Control: public, max-age=3600, must-revalidate

/app/*
  Cache-Control: no-cache, no-store, must-revalidate
`;

fs.writeFileSync(path.join(SITE_DIR, '_headers'), headersContent, 'utf8');
console.log('✓ Generated site/_headers (with edge security & app no-store rules)');

// Generate site/vercel.json for Vercel edge deployment
const vercelConfig = {
  cleanUrls: true,
  headers: [
    {
      source: "/(.*)",
      headers: [
        {
          key: "Content-Security-Policy",
          value: "default-src 'none'; connect-src https://cloudflare-dns.com https://dns.google; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: https:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none';"
        },
        {
          key: "X-Frame-Options",
          value: "DENY"
        },
        {
          key: "X-Content-Type-Options",
          value: "nosniff"
        },
        {
          key: "Referrer-Policy",
          value: "no-referrer"
        },
        {
          key: "Permissions-Policy",
          value: "geolocation=(), camera=(), microphone=(), payment=(), usb=()"
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains; preload"
        }
      ]
    },
    {
      source: "/app/(.*)",
      headers: [
        {
          key: "Cache-Control",
          value: "no-cache, no-store, must-revalidate"
        }
      ]
    }
  ]
};

fs.writeFileSync(path.join(SITE_DIR, 'vercel.json'), JSON.stringify(vercelConfig, null, 2), 'utf8');
console.log('✓ Generated site/vercel.json');

// Generate site/netlify.toml for Netlify edge deployment
const netlifyConfig = `[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'none'; connect-src https://cloudflare-dns.com https://dns.google; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: https:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none';"
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "no-referrer"
    Permissions-Policy = "geolocation=(), camera=(), microphone=(), payment=(), usb=()"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains; preload"

[[headers]]
  for = "/app/*"
  [headers.values]
    Cache-Control = "no-cache, no-store, must-revalidate"
`;

fs.writeFileSync(path.join(SITE_DIR, 'netlify.toml'), netlifyConfig, 'utf8');
console.log('✓ Generated site/netlify.toml');
