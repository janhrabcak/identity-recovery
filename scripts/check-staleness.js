#!/usr/bin/env node
/**
 * Cold-Start Identity Recovery Protocol - Staleness Evaluator
 * Inspects public/index.html metadata and evaluates freshness threshold.
 * Zero-dependency: pure Node.js standard library.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getArgValue(flag) {
  const args = process.argv.slice(2);
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
}

function resolveHtmlPath() {
  const custom = getArgValue('--html');
  if (custom) return path.resolve(process.cwd(), custom);

  const candidates = [
    path.resolve(process.cwd(), 'public/index.html'),
    path.resolve(process.cwd(), 'index.html'),
    path.resolve(__dirname, '../public/index.html'),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

export function evaluateVaultFreshness(htmlContent, htmlFilePath = null) {
  let generatedAtStr = null;
  let staleAfterMonths = 6;

  // 1. Try reading meta tags
  const genMatch = htmlContent.match(/<meta\s+name=["']vault-generated-at["']\s+content=["']([^"']+)["']/i);
  if (genMatch && genMatch[1]) {
    generatedAtStr = genMatch[1].trim();
  }

  const staleMatch = htmlContent.match(/<meta\s+name=["']vault-stale-after-months["']\s+content=["']([^"']+)["']/i);
  if (staleMatch && staleMatch[1]) {
    const parsed = parseInt(staleMatch[1].trim(), 10);
    if (!isNaN(parsed) && parsed > 0) {
      staleAfterMonths = parsed;
    }
  }

  // 2. Fallback: inspect git commit timestamp if file path is available
  if (!generatedAtStr && htmlFilePath && fs.existsSync(htmlFilePath)) {
    try {
      const gitDate = execSync(`git log -1 --format=%cI "${htmlFilePath}"`, { encoding: 'utf8' }).trim();
      if (gitDate) {
        generatedAtStr = gitDate;
      }
    } catch {
      // Git unavailable
    }
  }

  const now = new Date();

  if (!generatedAtStr) {
    return {
      status: 'UNKNOWN',
      generatedAt: null,
      staleAfterMonths,
      diffDays: 0,
      diffMonths: 0,
      daysUntilStale: 0,
      expireDate: null,
      message: 'No generation timestamp found in metadata or git history.'
    };
  }

  const genDate = new Date(generatedAtStr);
  const diffMs = now.getTime() - genDate.getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const diffMonths = +(diffDays / 30.4375).toFixed(1);

  const expireDate = new Date(genDate);
  expireDate.setMonth(expireDate.getMonth() + staleAfterMonths);
  const daysUntilStale = Math.round((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  let status = 'FRESH';
  let message = `Vault is fresh. Generated ${diffDays} days ago (${daysUntilStale} days remaining until staleness).`;

  if (daysUntilStale < 0) {
    status = 'STALE';
    message = `CRITICAL: Vault is stale! Expired ${Math.abs(daysUntilStale)} days ago on ${expireDate.toISOString().substring(0, 10)}.`;
  } else if (daysUntilStale <= 30) {
    status = 'EXPIRING_SOON';
    message = `WARNING: Vault is expiring soon! ${daysUntilStale} days remaining until staleness deadline (${expireDate.toISOString().substring(0, 10)}).`;
  }

  return {
    status,
    generatedAt: genDate.toISOString(),
    staleAfterMonths,
    diffDays,
    diffMonths,
    daysUntilStale,
    expireDate: expireDate.toISOString().substring(0, 10),
    message
  };
}

function writeGitHubOutput(key, value) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    fs.appendFileSync(outputFile, `${key}=${value}\n`, 'utf8');
  }
}

async function main() {
  const htmlPath = resolveHtmlPath();
  if (!htmlPath || !fs.existsSync(htmlPath)) {
    console.error('Error: Could not locate public/index.html');
    process.exit(1);
  }

  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  const result = evaluateVaultFreshness(htmlContent, htmlPath);

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('=== IDENTITY RECOVERY VAULT: STALENESS CHECK ===');
    console.log(`Status:             ${result.status}`);
    console.log(`Generated At:       ${result.generatedAt || 'Unknown'}`);
    console.log(`Vault Age:          ${result.diffDays} days (~${result.diffMonths} months)`);
    console.log(`Freshness Limit:    ${result.staleAfterMonths} Months`);
    console.log(`Staleness Deadline: ${result.expireDate || 'Unknown'}`);
    console.log(`Days Remaining:     ${result.daysUntilStale}`);
    console.log(`Assessment:         ${result.message}`);
    console.log('================================================');
  }

  // Set GitHub Action outputs
  writeGitHubOutput('status', result.status);
  writeGitHubOutput('days_remaining', result.daysUntilStale);
  writeGitHubOutput('diff_days', result.diffDays);
  writeGitHubOutput('diff_months', result.diffMonths);
  writeGitHubOutput('generated_at', result.generatedAt || 'unknown');
  writeGitHubOutput('expire_date', result.expireDate || 'unknown');
  writeGitHubOutput('stale_after_months', result.staleAfterMonths);
  writeGitHubOutput('message', result.message);

  if (process.argv.includes('--fail-on-stale') && result.status === 'STALE') {
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
