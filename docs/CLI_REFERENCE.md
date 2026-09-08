# 🛠️ CLI Reference & Offline Tooling

All offline scripts are strictly zero-dependency, running exclusively on the Node.js 18+ standard library and native Bash.

---

## 1. Automated Deployment Pipeline (`scripts/deploy.sh`)

The recommended way to rotate credentials and publish to the edge in one hardened operation:

```bash
./scripts/deploy.sh [path-to-payload.json]
```

### What `deploy.sh` Does Automatically:
1. **Pre-flight Checks:** Verifies Git repository status, remote connectivity, and payload schema completeness.
2. **Passphrase Ingestion:** Prompts with masked input, calculates Diceware entropy (~77 bits required), and requires confirmation to avoid typos.
3. **Offline WebCrypto Encryption:** Derives PBKDF2-600k keys and injects ciphertext directly into `public/index.html`.
4. **Automated Verification:** Runs all 16 automated tests in `tests/test-suite.js` to guarantee cryptographic and runtime integrity before committing.
5. **Git Safety Guard:** Audits the Git staging area; resets any pre-existing staged files and stages **strictly** `public/index.html`.
6. **Commit & Push:** Commits with UTC timestamp and pushes to `origin main`, triggering Cloudflare edge deployment.
7. **Plaintext Shredding:** Offers to permanently shred the unencrypted source file (3-pass random overwrite + zero-fill), defaulting to **Yes**.
8. **Cloudflare DNS Dead-Drop Sync:** Automatically updates the secondary DNS TXT record via Cloudflare API v4 if configured in `.env`.

---

## 2. Encryption CLI (`scripts/encrypt.js`)

Standalone Node.js CLI utility implementing PBKDF2-SHA-256 (600,000 rounds) and AES-GCM-256:

```bash
node scripts/encrypt.js [options]
```

### Options & Flags

| Flag | Description |
|---|---|
| `-i, --input <file>` | Path to unencrypted JSON payload file |
| `-p, --passphrase <phrase>` | Passphrase (prompted securely if omitted; prefer `ENCRYPT_PASSPHRASE` env var) |
| `-o, --output <file>` | Write Base64 ciphertext to a standalone file |
| `-d, --domain <domain>` | Recovery DNS domain to embed in HTML meta tag |
| `--embed-html <file>` | Injects ciphertext directly into `public/index.html` placeholder |
| `--decrypt <base64>` | Decrypts ciphertext and outputs formatted JSON to stdout |
| `--sample [fresh\|stale]` | Generates a template `templates/sample-payload.json` |
| `--allow-low-entropy` | Overrides the 6-word Diceware entropy requirement (testing only) |
| `-h, --help` | Displays help documentation |

### Common CLI Examples

```bash
# 1. Generate a fresh schema-compliant template
node scripts/encrypt.js --sample fresh

# 2. Encrypt & embed directly into index.html (interactive passphrase prompt)
node scripts/encrypt.js -i payload.json --embed-html public/index.html

# 3. Encrypt to standalone base64 file
ENCRYPT_PASSPHRASE="my six secret diceware words here" \
  node scripts/encrypt.js -i payload.json -o ciphertext.b64

# 4. Verify decryption of a ciphertext string offline
node scripts/encrypt.js --decrypt "$(cat ciphertext.b64)" -p "my six secret diceware words here"
```

---

## 3. Staleness Evaluator (`scripts/check-staleness.js`)

Zero-knowledge vault freshness evaluator used locally and in GitHub Actions:

```bash
node scripts/check-staleness.js [options]
```

### How It Works
Does **not** require any decryption passphrase. It inspects the public `<meta name="vault-generated-at">` and `<meta name="vault-stale-after-months">` tags in `public/index.html` and evaluates vault freshness.

### Options & Flags

| Flag | Description |
|---|---|
| `--html <path>` | Custom path to `index.html` (auto-detected if omitted) |
| `--json` | Output evaluation results as structured JSON |
| `--manage-issue` | Automatically create, update, or close GitHub staleness issues via `gh` |
| `--webhook <url>` | Dispatch high-priority push notification (ntfy.sh, Discord, Slack) |
| `--fail-on-stale` | Exit with code 1 if vault status is `STALE` (useful for pre-push hooks) |

---

## 4. Test Suite (`tests/test-suite.js`)

Runs end-to-end cryptographic and structural tests across 16 test suites:

```bash
npm test
# or: node tests/test-suite.js
```

### What Is Tested:
1. End-to-end encrypt & decrypt parity (Node WebCrypto $\leftrightarrow$ Browser WebCrypto).
2. Incorrect passphrase rejection via AES-GCM tag mismatch.
3. Tampered/corrupted ciphertext rejection.
4. Staleness logic calculation across FRESH, EXPIRING_SOON, and STALE states.
5. Zero-dependency & CSP compliance in `public/index.html`.
6. Automated HTML embedding pattern.
7. Staleness evaluator unit tests.
8. RFC 1035 multi-chunk DoH parser for Cloudflare and Google formats.
9. Configurable recovery DNS domain resolution.
10. Diceware passphrase entropy validator.
11. Whitespace and Unicode NFKC normalization parity.
12. Clipboard auto-scrubbing & memory purge hooks.
13. Cloudflare DNS API synchronization logic.
14. Paper printout stylesheet (`@media print`) and layout integrity.
15. Multi-channel push notification formatters (ntfy, Discord, Slack).
16. In-browser TOTP HMAC-SHA1 mathematical validation.
