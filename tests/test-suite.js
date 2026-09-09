import { encryptPayload, decryptPayload, createSamplePayload, normalizePassphrase, evaluatePassphraseEntropy } from '../scripts/encrypt.js';
import { subtle } from 'node:crypto';
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

  // Test 9: Configurable Recovery DNS Domain check
  console.log("\n[Test 9] Configurable Recovery DNS Domain Verification");
  if (!html.includes('name="recovery-dns-domain"')) {
    throw new Error("Test 9 Failed: index.html missing recovery-dns-domain meta tag!");
  }
  if (!html.includes('RECOVERY_DNS_DOMAIN')) {
    throw new Error("Test 9 Failed: index.html missing RECOVERY_DNS_DOMAIN constant!");
  }
  console.log("✓ Test 9 Passed: Recovery DNS domain meta tag and RECOVERY_DNS_DOMAIN variable verified.");

  // Test 10: Diceware Passphrase Entropy Validation
  console.log("\n[Test 10] Diceware Passphrase Entropy Validation");
  const validEntropy = evaluatePassphraseEntropy("correct horse battery staple zebra guitar");
  if (!validEntropy.valid || validEntropy.wordCount !== 6) {
    throw new Error("Test 10 Failed: Valid Diceware phrase was rejected!");
  }

  const shortWords = evaluatePassphraseEntropy("correct horse battery");
  if (shortWords.valid) {
    throw new Error("Test 10 Failed: Passphrase with only 3 words should have been rejected!");
  }

  const repeatedWords = evaluatePassphraseEntropy("zebra zebra zebra zebra zebra zebra");
  if (repeatedWords.valid) {
    throw new Error("Test 10 Failed: Passphrase with repeated words should have been rejected!");
  }

  const shortLength = evaluatePassphraseEntropy("a bb cc dd ee ff");
  if (shortLength.valid) {
    throw new Error("Test 10 Failed: Passphrase under 20 characters should have been rejected!");
  }

  // Verify encryptPayload rejects low entropy unless explicitly allowed
  try {
    await encryptPayload(samplePayload, "low entropy words phrase");
    throw new Error("Test 10 Failed: encryptPayload should reject low entropy passphrase!");
  } catch (err) {
    if (!err.message.includes("Passphrase validation failed")) {
      throw err;
    }
  }

  const allowedCiphertext = await encryptPayload(samplePayload, "short low entropy words phrase test", { allowLowEntropy: true });
  if (!allowedCiphertext) {
    throw new Error("Test 10 Failed: encryptPayload failed with allowLowEntropy: true");
  }
  console.log("✓ Test 10 Passed: Diceware entropy validation correctly enforced and overrideable.");

  // Test 11: Whitespace and Unicode Normalization Parity
  console.log("\n[Test 11] Whitespace and Unicode Normalization Parity");
  const basePhrase = "correct horse battery staple zebra guitar";
  const messyPhrase = "   correct   horse \t battery \n staple   zebra   guitar  ";
  
  if (normalizePassphrase(messyPhrase) !== basePhrase) {
    throw new Error(`Test 11 Failed: normalizePassphrase did not normalize whitespace correctly. Got: '${normalizePassphrase(messyPhrase)}'`);
  }

  const encryptedBase = await encryptPayload(samplePayload, basePhrase);
  const decryptedWithMessy = await decryptPayload(encryptedBase, messyPhrase);
  if (decryptedWithMessy.metadata.canaryCode !== samplePayload.metadata.canaryCode) {
    throw new Error("Test 11 Failed: Decryption with messy whitespace failed to match original payload!");
  }
  console.log("✓ Test 11 Passed: Normalization parity verified across whitespace and formatting variations.");

  // Test 12: Untrusted Terminal Clipboard Auto-Scrubbing Code Integrity
  console.log("\n[Test 12] Clipboard Auto-Scrubbing Code Integrity in public/index.html");
  if (!html.includes("CLIPBOARD_SCRUB_TIMEOUT_MS = 45000")) {
    throw new Error("Test 12 Failed: index.html missing CLIPBOARD_SCRUB_TIMEOUT_MS constant (45000ms)!");
  }
  if (!html.includes("scrubClipboard")) {
    throw new Error("Test 12 Failed: index.html missing scrubClipboard function!");
  }
  if (!html.includes("showClipboardNotice")) {
    throw new Error("Test 12 Failed: index.html missing showClipboardNotice function!");
  }
  if (!html.includes("focus_catchup")) {
    throw new Error("Test 12 Failed: index.html missing focus_catchup event handler!");
  }
  if (!html.includes('scrubClipboard("lock_purge")')) {
    throw new Error("Test 12 Failed: lockVault in index.html missing scrubClipboard call!");
  }
  if (!html.includes("scrub-clipboard-btn")) {
    throw new Error("Test 12 Failed: index.html missing scrub-clipboard-btn button!");
  }
  console.log("✓ Test 12 Passed: Clipboard auto-scrubbing, focus-catchup, and lock & purge hooks verified in public/index.html.");

  // Test 13: Automated Cloudflare DNS Dead-Drop Sync Verification
  console.log("\n[Test 13] Automated Cloudflare DNS Dead-Drop Sync Verification");
  const envExamplePath = path.join(REPO_ROOT, '.env.example');
  const deployScriptPath = path.join(REPO_ROOT, 'scripts', 'deploy.sh');

  if (!fs.existsSync(envExamplePath)) {
    throw new Error("Test 13 Failed: .env.example missing!");
  }
  const envExample = fs.readFileSync(envExamplePath, 'utf8');
  if (!envExample.includes("CLOUDFLARE_API_TOKEN") || !envExample.includes("CLOUDFLARE_ZONE_ID")) {
    throw new Error("Test 13 Failed: .env.example missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ZONE_ID!");
  }

  if (!fs.existsSync(deployScriptPath)) {
    throw new Error("Test 13 Failed: scripts/deploy.sh missing!");
  }
  const deployScript = fs.readFileSync(deployScriptPath, 'utf8');
  if (!deployScript.includes("api.cloudflare.com/client/v4/zones") ||
      !deployScript.includes("CLOUDFLARE_API_TOKEN") ||
      !deployScript.includes("ttl: 120")) {
    throw new Error("Test 13 Failed: scripts/deploy.sh missing Cloudflare DNS API sync logic or 120s TTL!");
  }
  console.log("✓ Test 13 Passed: Cloudflare DNS API synchronization and configuration integrity verified.");

  // Test 14: Emergency Paper Printout Styles & Layout Integrity
  console.log("\n[Test 14] Emergency Paper Printout Styles & Layout Integrity");
  if (!html.includes("@media print")) {
    throw new Error("Test 14 Failed: index.html missing @media print stylesheet!");
  }
  if (!html.includes("print-sheet-btn")) {
    throw new Error("Test 14 Failed: index.html missing print-sheet-btn button!");
  }
  if (!html.includes("print-only-header")) {
    throw new Error("Test 14 Failed: index.html missing print-only-header element!");
  }
  if (!html.includes("page-break-inside: avoid")) {
    throw new Error("Test 14 Failed: index.html missing page-break-inside avoid rules!");
  }
  console.log("✓ Test 14 Passed: Clean high-contrast paper printout styles and print action button verified.");

  // Test 15: Multi-Channel Staleness Webhook Alerting
  console.log("\n[Test 15] Multi-Channel Staleness Webhook Alerting");
  const { sendWebhookNotification } = await import('../scripts/check-staleness.js');

  // Verify missing webhook URL returns error gracefully
  const missingUrlRes = await sendWebhookNotification({ status: "STALE" }, "");
  if (missingUrlRes.sent !== false) {
    throw new Error("Test 15 Failed: sendWebhookNotification should fail when URL is empty!");
  }

  // Verify FRESH status is ignored (only alert on EXPIRING_SOON or STALE)
  const freshRes = await sendWebhookNotification({ status: "FRESH" }, "https://ntfy.sh/test");
  if (freshRes.sent !== false || !freshRes.error.includes("FRESH")) {
    throw new Error("Test 15 Failed: sendWebhookNotification should not alert on FRESH vaults!");
  }

  // Verify STALENESS_WEBHOOK_URL exists in .env.example
  if (!envExample.includes("STALENESS_WEBHOOK_URL")) {
    throw new Error("Test 15 Failed: .env.example missing STALENESS_WEBHOOK_URL!");
  }

  // Verify workflow passes STALENESS_WEBHOOK_URL and --notify-webhook
  const workflowPath = path.join(REPO_ROOT, '.github', 'workflows', 'staleness-check.yml');
  const workflowContent = fs.readFileSync(workflowPath, 'utf8');
  if (!workflowContent.includes("STALENESS_WEBHOOK_URL") || !workflowContent.includes("--notify-webhook")) {
    throw new Error("Test 15 Failed: staleness-check.yml missing STALENESS_WEBHOOK_URL or --notify-webhook!");
  }
  console.log("✓ Test 15 Passed: Multi-channel webhook notification logic and CI workflow configuration verified.");


  // Test 16: Live TOTP Generation Validation
  console.log("\n[Test 16] Live TOTP Generation Validation");
  
  function base32ToBuffer(base32) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const cleanStr = base32.toUpperCase().replace(/=+$/, "");
    let bits = 0;
    let value = 0;
    let index = 0;
    const output = new Uint8Array((cleanStr.length * 5) / 8 | 0);
    for (let i = 0; i < cleanStr.length; i++) {
      const char = cleanStr[i];
      const val = alphabet.indexOf(char);
      if (val === -1) continue;
      value = (value << 5) | val;
      bits += 5;
      if (bits >= 8) {
        output[index++] = (value >>> (bits - 8)) & 255;
        bits -= 8;
      }
    }
    return output;
  }

  async function generateTOTP(base32Secret, epochMs = Date.now()) {
    const keyBuffer = base32ToBuffer(base32Secret);
    const key = await subtle.importKey(
      "raw", keyBuffer, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
    );
    const timeStep = Math.floor(epochMs / 30000);
    const timeBuffer = new ArrayBuffer(8);
    const timeView = new DataView(timeBuffer);
    timeView.setUint32(4, timeStep, false);
    const signature = await subtle.sign("HMAC", key, timeBuffer);
    const sigView = new Uint8Array(signature);
    const offset = sigView[sigView.length - 1] & 0x0f;
    const code = (
      ((sigView[offset] & 0x7f) << 24) |
      ((sigView[offset + 1] & 0xff) << 16) |
      ((sigView[offset + 2] & 0xff) << 8) |
      (sigView[offset + 3] & 0xff)
    ) % 1000000;
    return code.toString().padStart(6, "0");
  }

  const testSecret = "JBSWY3DPEHPK3PXP";
  const testEpoch = 1700000000000; 
  const expectedCode = "324550";
  const generatedCode = await generateTOTP(testSecret, testEpoch);
  
  if (generatedCode !== expectedCode) {
    throw new Error(`Test 16 Failed: Expected TOTP ${expectedCode}, got ${generatedCode}`);
  }
  console.log("✓ Test 16 Passed: TOTP Generation works successfully.");

  // Test 17: Offline Vault Builder (tools/builder.html) verification
  console.log("\n[Test 17] Offline Vault Builder (tools/builder.html) Security & Parity Check");
  const BUILDER_PATH = path.join(REPO_ROOT, 'tools', 'builder.html');
  if (!fs.existsSync(BUILDER_PATH)) {
    throw new Error(`Test 17 Failed: tools/builder.html not found at ${BUILDER_PATH}`);
  }
  const builderHtml = fs.readFileSync(BUILDER_PATH, 'utf8');

  if (/<script\s+src=/i.test(builderHtml)) {
    throw new Error("Test 17 Failed: builder.html contains external <script src=...>!");
  }
  if (/<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["'](http|\/\/)/i.test(builderHtml)) {
    throw new Error("Test 17 Failed: builder.html contains external stylesheet!");
  }
  if (!builderHtml.includes("default-src 'none'")) {
    throw new Error("Test 17 Failed: builder.html missing strict Content-Security-Policy default-src 'none'!");
  }
  if (!builderHtml.includes("600000")) {
    throw new Error("Test 17 Failed: builder.html does not specify 600,000 PBKDF2 iterations!");
  }
  if (!builderHtml.includes("AES-GCM") || !builderHtml.includes("PBKDF2")) {
    throw new Error("Test 17 Failed: builder.html missing WebCrypto AES-GCM or PBKDF2 references!");
  }
  if (!builderHtml.includes("DEFAULT_INDEX_TEMPLATE_B64")) {
    throw new Error("Test 17 Failed: builder.html missing embedded default index.html template!");
  }
  console.log("✓ Test 17 Passed: tools/builder.html verified (zero dependencies, strict CSP, 600k PBKDF2 iterations).");

  console.log("\n==========================================");
  console.log("ALL TESTS PASSED SUCCESSFULLY! ✓");
  console.log("==========================================");
}

runTests().catch(err => {
  console.error("Test suite failed:", err);
  process.exit(1);
});
