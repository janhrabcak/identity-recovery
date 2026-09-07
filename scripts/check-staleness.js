#!/usr/bin/env node
/**
 * Cold-Start Identity Recovery Protocol - Staleness Evaluator & Alert Manager
 * Inspects public/index.html metadata and evaluates freshness threshold.
 * Zero-dependency: pure Node.js standard library.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getArgValue(flag) {
  const args = process.argv.slice(2);
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return null;
  const val = args[idx + 1];
  return val.startsWith('--') ? null : val;
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

function manageGitHubIssue(result) {
  console.log('\n--- Managing GitHub Staleness Issues ---');
  let existingIssueNum = null;
  try {
    const issueOutput = execFileSync(
      'gh', ['issue', 'list', '--label', 'vault-staleness', '--state', 'open', '--json', 'number', '--jq', '.[0].number'],
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
    ).trim();
    if (issueOutput && !isNaN(parseInt(issueOutput, 10))) {
      existingIssueNum = parseInt(issueOutput, 10);
    }
  } catch (err) {
    console.warn('Notice: Could not query existing GitHub issues (gh CLI or GH_TOKEN may not be set).');
    return;
  }

  const { status, daysUntilStale, generatedAt, expireDate, staleAfterMonths, diffDays, diffMonths } = result;

  if (status === 'EXPIRING_SOON' || status === 'STALE') {
    const isStale = status === 'STALE';
    const severity = isStale ? 'CRITICAL ALERT' : 'EXPIRING SOON WARNING';
    const title = isStale
      ? `🚨 CRITICAL: Identity Recovery Vault is STALE (Expired on ${expireDate})`
      : `⚠️ WARNING: Identity Recovery Vault expiring in ${daysUntilStale} days (Rotate by ${expireDate})`;

    const body = [
      `## ${severity}: Action Required`,
      '',
      `Your cold-start identity recovery vault has reached or is approaching its **${staleAfterMonths}-month freshness limit**.`,
      '',
      `- **Vault Generated:** \`${generatedAt}\` (${diffDays} days ago / ~${diffMonths} months)`,
      `- **Staleness Threshold:** **${staleAfterMonths} Months**`,
      `- **Expiration Deadline:** \`${expireDate}\``,
      `- **Days Remaining:** **${daysUntilStale} days**`,
      `- **Freshness Status:** **${status}**`,
      '',
      '---',
      '',
      '### 🛡️ Why This Matters',
      'In a physical disaster scenario (lost phone, lost YubiKey, lost wallet), stale Google 2SV backup codes or outdated 1Password secret keys will lead to permanent lockout.',
      '',
      '### 📋 Recommended Rotation Steps:',
      '1. Generate new Google 2SV backup codes and verify your 1Password credentials.',
      '2. Run the automated deployment script on your trusted machine:',
      '   ```bash',
      '   ./scripts/deploy.sh payload.json',
      '   ```',
      '3. Committing and pushing the updated vault will automatically trigger Cloudflare edge deployment and **automatically resolve/close this issue**.',
      '',
      '---',
      '*Generated by automated Identity Recovery Protocol Monitor.*'
    ].join('\n');

    if (existingIssueNum) {
      console.log(`Updating existing open issue #${existingIssueNum}...`);
      execFileSync('gh', ['issue', 'edit', String(existingIssueNum), '--title', title, '--body', body], { stdio: 'inherit' });
      execFileSync('gh', ['issue', 'comment', String(existingIssueNum), '--body', `⏱️ **Staleness Reminder:** Current status is **${status}** with **${daysUntilStale} days** remaining until expiration (${expireDate}).`], { stdio: 'inherit' });
    } else {
      console.log('Creating new staleness alert issue...');
      try {
        execFileSync('gh', ['label', 'create', 'vault-staleness', '--description', 'Identity Recovery Vault Staleness Alerts', '--color', 'B60205'], { stdio: 'ignore' });
      } catch (e) {
        // Label likely already exists, ignore
      }
      execFileSync('gh', ['issue', 'create', '--title', title, '--body', body, '--label', 'vault-staleness'], { stdio: 'inherit' });
    }
  } else if (status === 'FRESH') {
    if (existingIssueNum) {
      console.log(`Closing resolved issue #${existingIssueNum}...`);
      execFileSync('gh', ['issue', 'close', String(existingIssueNum), '--comment', `✓ **Resolved:** Recovery vault was rotated on ${generatedAt}. Current vault is **FRESH** (${daysUntilStale} days remaining until staleness threshold). Closing alert.`], { stdio: 'inherit' });
    } else {
      console.log(`Vault is fresh (${daysUntilStale} days remaining). No open issues to resolve.`);
    }
  }
}

/**
 * Dispatches high-priority push notifications to webhooks (ntfy.sh, Discord, Slack, or generic HTTP)
 * @param {object} result - Freshness evaluation result
 * @param {string} [webhookUrl] - Target webhook URL
 * @returns {Promise<{ sent: boolean, status?: number, error?: string }>}
 */
export async function sendWebhookNotification(result, webhookUrl = process.env.STALENESS_WEBHOOK_URL) {
  if (!webhookUrl || typeof webhookUrl !== 'string' || webhookUrl.trim().length === 0) {
    return { sent: false, error: 'No webhook URL provided.' };
  }

  const url = webhookUrl.trim();
  const { status, daysUntilStale, generatedAt, expireDate, staleAfterMonths, diffDays, message } = result;

  // Only alert if expiring soon or stale
  if (status !== 'EXPIRING_SOON' && status !== 'STALE') {
    return { sent: false, error: `Vault status is ${status}; webhook alerts only trigger on EXPIRING_SOON or STALE.` };
  }

  const isStale = status === 'STALE';
  const severity = isStale ? 'CRITICAL ALERT' : 'EXPIRING SOON';

  let reqInit = {};

  if (url.includes('ntfy.sh')) {
    // ntfy.sh format
    reqInit = {
      method: 'POST',
      headers: {
        'Title': isStale ? `🚨 Vault is STALE (Expired ${expireDate})` : `⏳ Vault expiring in ${daysUntilStale} days`,
        'Priority': isStale ? '5' : '4',
        'Tags': isStale ? 'rotating_light,skull,lock' : 'hourglass,warning,key'
      },
      body: `Your cold-start identity recovery vault is ${status}!\n\nGenerated: ${generatedAt} (${diffDays} days ago)\nExpiration deadline: ${expireDate}\n\nAction required: Rotate your credentials using ./scripts/deploy.sh`
    };
  } else if (url.includes('discord.com/api/webhooks')) {
    // Discord webhook format
    reqInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: isStale ? `🚨 CRITICAL: Identity Recovery Vault is STALE` : `⚠️ WARNING: Identity Recovery Vault Expiring Soon`,
          description: message,
          color: isStale ? 15158332 : 16753920,
          fields: [
            { name: "Status", value: status, inline: true },
            { name: "Days Remaining", value: String(daysUntilStale), inline: true },
            { name: "Expiration Date", value: expireDate || "Unknown", inline: true },
            { name: "Generated At", value: generatedAt || "Unknown", inline: false }
          ],
          footer: { text: "Cold-Start Identity Recovery Protocol Monitor" }
        }]
      })
    };
  } else if (url.includes('hooks.slack.com')) {
    // Slack webhook format
    reqInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `${isStale ? '🚨 *CRITICAL:*' : '⚠️ *WARNING:*'} ${message}\n*Status:* ${status} | *Days Remaining:* ${daysUntilStale} | *Deadline:* ${expireDate}`
      })
    };
  } else {
    // Generic JSON payload
    reqInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'vault_staleness',
        severity,
        status,
        daysUntilStale,
        diffDays,
        staleAfterMonths,
        generatedAt,
        expireDate,
        message
      })
    };
  }

  try {
    const res = await fetch(url, reqInit);
    if (res.ok) {
      console.log(`✓ Webhook alert sent successfully to: ${url.replace(/\/[^/]{8,}$/, '/***')}`);
      return { sent: true, status: res.status };
    } else {
      const errText = await res.text().catch(() => '');
      console.warn(`Warning: Webhook responded with status ${res.status}: ${errText}`);
      return { sent: false, status: res.status, error: errText };
    }
  } catch (err) {
    console.warn(`Warning: Webhook dispatch error: ${err.message}`);
    return { sent: false, error: err.message };
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

  if (process.argv.includes('--manage-issue')) {
    manageGitHubIssue(result);
  }

  const webhookUrl = getArgValue('--webhook') || process.env.STALENESS_WEBHOOK_URL;
  if (webhookUrl || process.argv.includes('--notify-webhook')) {
    if (webhookUrl) {
      await sendWebhookNotification(result, webhookUrl);
    } else {
      console.warn('Notice: --notify-webhook requested but STALENESS_WEBHOOK_URL is not set.');
    }
  }

  if (process.argv.includes('--fail-on-stale') && result.status === 'STALE') {
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file://').href) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
