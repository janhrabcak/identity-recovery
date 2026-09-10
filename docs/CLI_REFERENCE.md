# 🛠️ CLI Reference & Offline Tooling

All offline scripts are strictly zero-dependency, running exclusively on the Node.js 18+ standard library and native Bash.

---

## 1. 1-Command Automated CLI Wizard (Zero Git Clone)

The fastest and most secure way to build, test, and deploy your vault with **zero repository cloning**:

```bash
npx github:janhrabcak/identity-recovery
```

### What the 1-Command CLI Automates:
1. **Zero Git Clone:** Runs instantly via `npx` without needing to clone or manage a local Git repository.
2. **Interactive Setup Wizard:** Automatically creates a starter `payload.json` template or uses your existing credentials file.
3. **Diceware Passphrase Handling:** Generates a cryptographically secure 8-word Diceware passphrase (~80 bits entropy) or strictly validates your custom passphrase (minimum 6 words).
4. **Offline WebCrypto Encryption:** Uses PBKDF2-SHA256 (600,000 rounds) and AES-GCM-256 to build the self-contained `index.html` Web Recovery Terminal (Pillar 1) and generates the secondary DNS TXT dead-drop ciphertext (Pillar 2).
5. **Automated Verification:** Executes all 20 end-to-end cryptographic and edge security test suites before publishing.
6. **Direct Edge Deployment:** Uploads directly to Cloudflare Pages, Netlify, or Vercel with zero Git secrets.
7. **Cloudflare DNS Dead-Drop Sync:** Automatically pushes the encrypted Base64 ciphertext to your Cloudflare DNS zone as a `TXT` record with 120s TTL (or prints the exact DNS table for other registrars).
8. **Secure Plaintext Shredding:** Offers to securely wipe unencrypted credentials from disk (3-pass overwrite + zero-fill).

You can also pass arguments directly:
```bash
# Direct deploy with an existing payload to a specific provider
npx github:janhrabcak/identity-recovery payload.json --provider cloudflare --project my-vault
npx github:janhrabcak/identity-recovery payload.json --provider netlify --site <SITE_ID>
npx github:janhrabcak/identity-recovery payload.json --provider vercel
```

---

## 2. Local Deployment Pipeline (`scripts/deploy.sh`)

For users working within a cloned repository, air-gapped offline environments, or custom CI/CD pipelines:

```bash
./scripts/deploy.sh [options] [path-to-payload.json]
```

### Options & Flags
- `--provider <name>`: Target hosting provider: `cloudflare` (default), `netlify`, or `vercel`.
- `--project <name>`: Cloudflare Pages project name (for direct upload).
- `--site <id>`: Netlify Site ID (for direct upload).
- `--token <token>`: Auth token for Vercel or Netlify direct upload.
- `--direct-upload`: Direct edge upload without committing ciphertext to Git.
- `--git`: Force Git commit & push mode (for private repositories).
- `-h, --help`: Display help documentation.

### Deployment Modes
1. **Direct Edge Upload Mode (Default when provider credentials are set):**
   Encrypts the payload inside an ephemeral staging directory, verifies tests, and uploads directly to edge CDN via CLI (Wrangler, Netlify CLI, or Vercel CLI). `public/index.html` in Git is never modified or committed, keeping public repositories 100% clean of personal data.
2. **Git Push Mode (Fallback for private repositories):**
   Encrypts into `public/index.html`, runs test verification, strictly stages only `public/index.html`, commits, and pushes to `origin main`.

### What `deploy.sh` Does Automatically:
1. **Pre-flight Checks:** Verifies Git repository status, remote connectivity, and payload schema completeness.
2. **Passphrase Ingestion:** Prompts with masked input, calculates Diceware entropy (minimum 6 words, 8 recommended for ~80 bits), and requires confirmation to avoid typos.
3. **Offline WebCrypto Encryption:** Derives PBKDF2-600k keys and injects ciphertext directly into HTML.
4. **Automated Verification:** Runs all 20 automated tests in `tests/test-suite.js` to guarantee cryptographic, edge security, and runtime integrity.
5. **Edge Deployment:** Deploys directly via provider CLI or pushes to Git.
6. **Plaintext Shredding:** Offers to permanently shred the unencrypted source file (3-pass random overwrite + zero-fill), defaulting to **Yes**.
7. **Cloudflare DNS Dead-Drop Sync:** Automatically updates the secondary DNS TXT record via Cloudflare API v4 if configured in `.env`.

---

## 3. Encryption CLI (`scripts/encrypt.js`)

Standalone Node.js CLI utility implementing PBKDF2-SHA-256 (600,000 rounds) and AES-GCM-256:

> [!TIP]
> **Prefer a GUI?** If you do not want to use the Node.js CLI, open [`tools/builder.html`](../tools/builder.html) directly in any web browser to compile your vault client-side with interactive Diceware generation and zero terminal usage.

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
| `--allow-low-entropy` | Overrides the Diceware entropy requirement (testing only) |
| `-h, --help` | Displays help documentation |

### Common CLI Examples

```bash
# 1. Generate a fresh schema-compliant template
node scripts/encrypt.js --sample fresh

# 2. Encrypt & embed directly into index.html (interactive passphrase prompt)
node scripts/encrypt.js -i payload.json --embed-html public/index.html

# 3. Encrypt to standalone base64 file
ENCRYPT_PASSPHRASE="my eight secret diceware words phrase here" \
  node scripts/encrypt.js -i payload.json -o ciphertext.b64

# 4. Verify decryption of a ciphertext string offline
node scripts/encrypt.js --decrypt "$(cat ciphertext.b64)" -p "my eight secret diceware words phrase here"
```

---

## 4. Staleness Evaluator (`scripts/check-staleness.js`)

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

## 5. Test Suite (`tests/test-suite.js`)

Runs end-to-end cryptographic and structural tests across 20 test suites:

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
17. Offline Vault Builder (`tools/builder.html`) security, CSP, and parity check.
18. Multi-provider edge security parity and modular provider registry (`scripts/providers/`).
19. Modular Credential Card Architecture & Normalization Parity.
20. Public Product Hub (`site/`), Cloudflare Pages configuration, and repository trust assets.

---

## 6. Builder Generator (`scripts/build-builder.js`)

Recompiles the standalone `tools/builder.html` tool, embedding the latest base64 template from `public/index.html` and updating the Diceware dictionary:

```bash
npm run build:builder
# or: node scripts/build-builder.js
```

Run this command whenever you make improvements to `public/index.html` or styles to keep the offline web builder in sync.

---

## 7. Site Builder (`scripts/build-site.js`)

Synchronizes the web platform assets (`site/`) and GitHub Pages demo (`docs/`), and generates multi-provider edge security headers and canonical redirects via the provider registry:

```bash
npm run build:site
# or: node scripts/build-site.js
```

---

## 8. Modular Web Platform Deployment (`scripts/deploy-site.sh`)

Deploys the public web platform (`site/`) to your preferred edge hosting provider (Cloudflare Pages, Netlify, or Vercel):

```bash
# Deploy to Cloudflare Pages (default):
npm run deploy:site
# Or specify options:
./scripts/deploy-site.sh --provider cloudflare --project idrecoverykit

# Deploy to Netlify:
npm run deploy:site -- --provider netlify

# Deploy to Vercel:
npm run deploy:site -- --provider vercel

# List supported providers and environment credential status:
./scripts/deploy-site.sh --list-providers
```

---

## 9. Hosting Provider Registry CLI (`scripts/providers/index.js`)

Command-line utility for inspecting and managing modular hosting providers:

```bash
# List all providers and credential status:
node scripts/providers/index.js list

# Generate edge configs across all providers:
node scripts/providers/index.js generate site

# Print CLI deploy command for a specific provider:
node scripts/providers/index.js deploy-cmd cloudflare site
```

