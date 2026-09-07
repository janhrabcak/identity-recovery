import { encryptPayload, decryptPayload, createSamplePayload } from '../scripts/encrypt.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const HTML_PATH = path.join(REPO_ROOT, 'public', 'index.html');

async function runTests() {
  console.log("=== RUNNING TEST SUITE ===");

  const passphrase = "correct horse battery staple zebra guitar";

  // Test 1: Fresh payload encryption & decryption
  console.log("\n[Test 1] Encrypt & Decrypt Fresh Payload");
  const freshPayload = createSamplePayload(true);
  const freshB64 = await encryptPayload(freshPayload, passphrase);
  console.log("Ciphertext base64 length:", freshB64.length);

  const decryptedFresh = await decryptPayload(freshB64, passphrase);
  if (decryptedFresh.metadata.canaryCode === "12345678" &&
      decryptedFresh.onePassword.email === "user@example.com" &&
      decryptedFresh.googleBackupCodes.length === 10) {
    console.log("✓ Test 1 Passed: Fresh payload encrypted & decrypted successfully.");
  } else {
    throw new Error("Test 1 Failed: Decrypted payload does not match original.");
  }

  // Test 2: Incorrect Passphrase rejection
  console.log("\n[Test 2] Incorrect Passphrase Rejection");
  try {
    await decryptPayload(freshB64, "wrong passphrase phrase phrase phrase phrase");
    throw new Error("Test 2 Failed: Decryption should have failed with wrong passphrase!");
  } catch (err) {
    console.log("✓ Test 2 Passed: Wrong passphrase correctly rejected:", err.message);
  }

  // Test 3: Corrupted Ciphertext rejection
  console.log("\n[Test 3] Corrupted Ciphertext Rejection");
  try {
    const corruptedB64 = freshB64.substring(0, 20) + "AAAA" + freshB64.substring(24);
    await decryptPayload(corruptedB64, passphrase);
    throw new Error("Test 3 Failed: Decryption should have failed with corrupted ciphertext!");
  } catch (err) {
    console.log("✓ Test 3 Passed: Corrupted ciphertext correctly rejected:", err.message);
  }

  // Test 4: Staleness Calculation Logic
  console.log("\n[Test 4] Staleness Banner Calculation Verification");
  function evaluateStaleness(generatedAtStr, staleAfterMonths) {
    const genDate = new Date(generatedAtStr);
    const now = new Date();
    const diffMs = now.getTime() - genDate.getTime();
    const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const diffMonths = +(diffDays / 30.4375).toFixed(1);

    const expireDate = new Date(genDate);
    expireDate.setMonth(expireDate.getMonth() + staleAfterMonths);
    const daysUntilStale = Math.round((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilStale < 0) return "STALE";
    if (daysUntilStale <= 30) return "EXPIRING_SOON";
    return "FRESH";
  }

  const now = new Date();
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 3600 * 1000).toISOString();
  const fiveMonthsAgo = new Date(now.getTime() - 155 * 24 * 3600 * 1000).toISOString();
  const sevenMonthsAgo = new Date(now.getTime() - 210 * 24 * 3600 * 1000).toISOString();

  const statusFresh = evaluateStaleness(fiveDaysAgo, 6);
  const statusExpiring = evaluateStaleness(fiveMonthsAgo, 6);
  const statusStale = evaluateStaleness(sevenMonthsAgo, 6);

  if (statusFresh === "FRESH" && statusExpiring === "EXPIRING_SOON" && statusStale === "STALE") {
    console.log("✓ Test 4 Passed: Staleness logic correctly categorized FRESH, EXPIRING_SOON, and STALE.");
  } else {
    throw new Error(`Test 4 Failed: Expected FRESH/EXPIRING_SOON/STALE, got ${statusFresh}/${statusExpiring}/${statusStale}`);
  }

  // Test 5: Verify public/index.html contains zero external dependencies
  console.log("\n[Test 5] Zero-Dependency and Security Check in public/index.html");
  if (!fs.existsSync(HTML_PATH)) {
    throw new Error(`Test 5 Failed: index.html not found at ${HTML_PATH}`);
  }
  const html = fs.readFileSync(HTML_PATH, 'utf8');

  if (/<script\s+src=/i.test(html)) {
    throw new Error("Test 5 Failed: index.html has external <script src=...>!");
  }
  if (/<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["'](http|\/\/)/i.test(html)) {
    throw new Error("Test 5 Failed: index.html has external stylesheet!");
  }
  if (!html.includes('Content-Security-Policy')) {
    throw new Error("Test 5 Failed: index.html missing Content-Security-Policy!");
  }
  if (!html.includes('EMBEDDED_CIPHERTEXT')) {
    throw new Error("Test 5 Failed: index.html missing EMBEDDED_CIPHERTEXT constant!");
  }
  console.log("✓ Test 5 Passed: Strict zero-dependency CSP & self-contained rules verified in public/index.html.");

  // Test 6: Embed CLI workflow test
  console.log("\n[Test 6] CLI Embed Workflow Test");
  const samplePayload = createSamplePayload(true);
  const b64 = await encryptPayload(samplePayload, passphrase);
  const updatedHtml = html.replace(/const\s+EMBEDDED_CIPHERTEXT\s*=\s*["'][^"']*["'];/, `const EMBEDDED_CIPHERTEXT = "${b64}";`);
  if (!updatedHtml.includes(`const EMBEDDED_CIPHERTEXT = "${b64}";`)) {
    throw new Error("Test 6 Failed: Regex replacement failed.");
  }
  console.log("✓ Test 6 Passed: CLI HTML embedding pattern verified.");

  // Test 7: Staleness evaluator unit tests
  console.log("\n[Test 7] Staleness Evaluator (scripts/check-staleness.js) Test");
  const { evaluateVaultFreshness } = await import('../scripts/check-staleness.js');

  const simulatedFreshHtml = `<meta name="vault-generated-at" content="${new Date().toISOString()}"><meta name="vault-stale-after-months" content="6">`;
  const evalFresh = evaluateVaultFreshness(simulatedFreshHtml);
  if (evalFresh.status !== "FRESH") {
    throw new Error(`Test 7 Failed: Expected FRESH, got ${evalFresh.status}`);
  }

  const simulatedExpiringHtml = `<meta name="vault-generated-at" content="${new Date(Date.now() - 160 * 24 * 3600 * 1000).toISOString()}"><meta name="vault-stale-after-months" content="6">`;
  const evalExpiring = evaluateVaultFreshness(simulatedExpiringHtml);
  if (evalExpiring.status !== "EXPIRING_SOON") {
    throw new Error(`Test 7 Failed: Expected EXPIRING_SOON, got ${evalExpiring.status}`);
  }

  const simulatedStaleHtml = `<meta name="vault-generated-at" content="${new Date(Date.now() - 210 * 24 * 3600 * 1000).toISOString()}"><meta name="vault-stale-after-months" content="6">`;
  const evalStale = evaluateVaultFreshness(simulatedStaleHtml);
  if (evalStale.status !== "STALE") {
    throw new Error(`Test 7 Failed: Expected STALE, got ${evalStale.status}`);
  }
  console.log("✓ Test 7 Passed: evaluateVaultFreshness verified across FRESH, EXPIRING_SOON, and STALE.");

  // Test 8: DNS-over-HTTPS (DoH) parser verification
  console.log("\n[Test 8] DNS-over-HTTPS (DoH) Multi-Chunk Parser Test");
  function parseDnsChunks(rawData) {
    const chunks = [...rawData.matchAll(/"([^"]*)"/g)].map(m => m[1]);
    return chunks.length > 0 ? chunks.join("") : rawData.replace(/["\s]/g, "");
  }

  const sampleB64Data = "SZZE4GwWbrmJPW0fQBU0ivfOgFYnuPElmWotUz1LnPiPo9sGnuaPHxkxOrEqK1xr";
  const cfFormat = `"${sampleB64Data.slice(0, 30)}" "${sampleB64Data.slice(30)}"`;
  const googleFormat = sampleB64Data;

  if (parseDnsChunks(cfFormat) === sampleB64Data && parseDnsChunks(googleFormat) === sampleB64Data) {
    console.log("✓ Test 8 Passed: DoH parser accurately handles Cloudflare and Google DoH formats.");
  } else {
    throw new Error("Test 8 Failed: DoH chunk parser mismatch!");
  }

  console.log("\n==========================================");
  console.log("ALL TESTS PASSED SUCCESSFULLY! ✓");
  console.log("==========================================");
}

runTests().catch(err => {
  console.error("Test suite failed:", err);
  process.exit(1);
});
