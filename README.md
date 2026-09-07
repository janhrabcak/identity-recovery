# Cold-Start Identity Recovery Protocol

Stateless, zero-hardware emergency credential recovery protocol designed to restore primary identity and root-of-trust access from an untrusted terminal or newly procured device anywhere in the world.

- **Root of Trust:** 1Password (holds all credentials, Google backup codes, and downstream accounts).
- **Primary Identity:** Google (@gmail.com with 2SV enabled).
- **Disaster Scenario:** Total physical hardware loss (no phone, no YubiKey, no wallet, no trusted devices).
- **Cryptography:** AES-GCM-256 with PBKDF2-SHA-256 (600,000 iterations, 16-byte random salt, 12-byte random IV).
- **Key Material:** Memorized 6-word Diceware passphrase (~77 bits entropy).
- **Runtime:** Standalone, single-file zero-dependency `public/index.html` using browser-native WebCrypto (`window.crypto.subtle`).
- **Hosting Target:** Cloudflare Pages / Workers (recommended) or GitHub Pages served over HTTPS via custom domain (`sos.<domain>.com`).

---

## 📁 Repository Directory Structure

```text
identity-recovery/
├── public/                       # 🌐 Publicly deployed to Cloudflare Edge
│   ├── index.html                # Recovery terminal client (contains encrypted ciphertext)
│   └── _headers                  # HTTP security headers (CSP, HSTS, no-store, anti-clickjacking)
│
├── scripts/                      # 🛠️ Private offline tools (runs on trusted machine only)
│   ├── deploy.sh                 # Hardened 7-step rotation & publish pipeline
│   ├── encrypt.js                # WebCrypto AES-GCM / PBKDF2 offline CLI
│   └── check-staleness.js        # Zero-knowledge staleness evaluator for CI
│
├── .github/workflows/            # ⏰ Scheduled monitoring
│   └── staleness-check.yml       # Monthly automated staleness alert workflow
│
├── templates/                    # 📋 Safe dummy templates
│   └── sample-payload.json       # Template recovery schema
│
├── tests/                        # 🧪 Verification suite
│   └── test-suite.js             # Automated crypto & parity tests (15 automated tests)
│
├── .env.example                  # Environment configuration template (RECOVERY_DOMAIN)
├── .gitignore                    # Security boundary (blocks unencrypted payload.json)
├── README.md                     # Operational documentation & quick run commands
└── SPEC.md                       # Full cryptographic & architectural specification
```

---

## 🏗️ Architecture & Recovery Flow

```text
+-------------------------------------------------------------------------+
| TRUSTED OFFLINE ENVIRONMENT (Local Machine)                             |
|                                                                         |
|  [payload.json] (Secret Key, Backup Codes, Notes)                       |
|         +                                                               |
|  [6-word Diceware Passphrase] (~77 bits entropy)                        |
|         |                                                               |
|         v                                                               |
|  ./scripts/deploy.sh payload.json                                       |
|    - Validates payload schema and JSON syntax                           |
|    - Masked passphrase prompt with typo confirmation & entropy check    |
|    - PBKDF2-SHA-256 (600,000 rounds) + 16-byte salt                     |
|    - AES-GCM-256 Encryption + 12-byte IV                                |
|    - Injects Base64 into public/index.html                              |
|    - Runs tests/test-suite.js                                           |
|    - Stages strictly public/index.html (guarantees no secret leaks)     |
|    - Commits & pushes to origin main                                    |
|    - Securely shreds plaintext payload.json (3 passes + zero-fill)      |
|    - Automatically syncs Cloudflare DNS TXT dead-drop via API v4        |
+-------------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------------+
| CLOUDFLARE EDGE (Anycast Global CDN)                                    |
|                                                                         |
|  - Reads wrangler.json (assets pointing to ./public)                    |
|  - Only public/ files are deployed; scripts & tests remain private      |
|  - Serves public/_headers (Strict CSP, HSTS, no-store, anti-clickjacking)|
|  - Accessible globally at: https://sos.<domain>.com                     |
+-------------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------------+
| DISASTER RECOVERY (Untrusted Kiosk / Hotel PC / Retail Device)          |
|                                                                         |
|  1. Navigate to: https://sos.<domain>.com                               |
|  2. Type memorized 6-word Diceware passphrase                           |
|  3. In-Browser WebCrypto PBKDF2 (600k rounds) & AES-GCM Decrypt         |
|  4. Check Staleness Banner (FRESH / EXPIRING SOON / STALE)              |
|  5. Copy Google 2SV Backup Code (Track single-use via Strikethrough)    |
|  6. Sign in to Google -> Open my.1password.com -> Sign in to 1Password  |
|  7. Click "Lock & Purge" (Wipes all secrets, memory, DOM, and session)  |
+-------------------------------------------------------------------------+
```

---

## 🚀 Quick Run Commands

### ⚡ Automated Rotation & Deploy Script (Recommended)
To rotate your credentials, verify the crypto, commit strictly `public/index.html`, push to Cloudflare, and securely shred the unencrypted JSON payload in a single hardened command:
```bash
./scripts/deploy.sh [path-to-payload.json]
```
*(If no payload file is passed as an argument, it automatically uses `payload.json` or prompts for a path. In Step 7, secure plaintext shredding defaults to **Yes**, and the Cloudflare DNS TXT record is automatically synchronized via API if configured).*

---

### 🌐 Transferability & Custom Domain Configuration
The entire repository is fully portable to any custom domain:
- **Environment file (`.env`)**: Copy `.env.example` to `.env` and set:
  - `RECOVERY_DOMAIN=recovery.yourdomain.com`
  - *(Optional)* `CLOUDFLARE_API_TOKEN` & `CLOUDFLARE_ZONE_ID` to automatically sync the DNS TXT dead-drop on every deployment.
- **Inline CLI variable**: Pass `RECOVERY_DOMAIN=recovery.yourdomain.com ./scripts/deploy.sh`.
- **CLI Flag**: Run `node scripts/encrypt.js --domain recovery.yourdomain.com --embed-html public/index.html`.
- **HTML Meta Tag**: Set `<meta name="recovery-dns-domain" content="recovery.yourdomain.com">` in `public/index.html`.
- **On-the-Fly URL Parameter**: Visit `https://sos.<domain>.com/?dns=recovery.yourdomain.com` to query an arbitrary recovery domain without code changes.

---

### Manual Step-by-Step Workflow

#### 1. Generate a Sample Recovery Payload
Generate a template `templates/sample-payload.json` matching the specification schema:
```bash
# Generate a fresh sample payload (generated 5 days ago)
node scripts/encrypt.js --sample fresh

# Or generate a stale sample payload (generated 7 months ago) to test the warning banner
node scripts/encrypt.js --sample stale
```

#### 2. Encrypt & Embed Directly into `public/index.html`
Derive key material via PBKDF2 (600,000 iterations), encrypt the payload with AES-GCM-256, and inject the Base64 ciphertext into `public/index.html`:
```bash
node scripts/encrypt.js -i templates/sample-payload.json -p "correct horse battery staple zebra guitar" --embed-html public/index.html
```

#### 3. Encrypt to Standalone Output File or Terminal
```bash
# Output base64 ciphertext to file
node scripts/encrypt.js -i templates/sample-payload.json -p "correct horse battery staple zebra guitar" -o ciphertext.b64

# Print base64 ciphertext directly to stdout
node scripts/encrypt.js -i templates/sample-payload.json -p "correct horse battery staple zebra guitar"
```

#### 4. Verify Decryption via CLI
Verify that a ciphertext string decrypts correctly with the passphrase:
```bash
node scripts/encrypt.js --decrypt "$(cat ciphertext.b64)" -p "correct horse battery staple zebra guitar"
```

#### 5. Query Ciphertext from Secondary DNS Dead-Drop
If web browsing is blocked or Cloudflare Pages is unavailable, retrieve the ciphertext via DNS:
```bash
dig +short TXT recovery.hrabcak.com | tr -d ' "\n'
```

#### 6. Run the Automated Test Suite
Execute end-to-end cryptographic parity, staleness logic, corrupted payload rejection, zero-dependency checks, and DoH chunk parsing:
```bash
node tests/test-suite.js
```
*(Runs 15 automated test suites ensuring zero regressions).*

#### 7. Preview / Test Recovery Terminal Locally
Because `public/index.html` is strictly self-contained with no external build tools, you can open it directly in any browser:
```bash
# Direct browser opening (Linux)
xdg-open public/index.html

# Or serve via lightweight local HTTP server
python3 -m http.server 8080 --directory public
# Open http://localhost:8080 in your browser
```

---

## 📋 Payload Schema (`templates/sample-payload.json`)

```json
{
  "metadata": {
    "generatedAt": "2026-09-02T07:18:48.955Z",
    "staleAfterMonths": 6,
    "canaryCode": "12345678"
  },
  "onePassword": {
    "email": "user@example.com",
    "secretKey": "A3-XXXXXX-XXXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
    "accountKeyHint": "Personal Emergency Vault"
  },
  "googleBackupCodes": [
    "23456789",
    "34567890",
    "45678901",
    "56789012",
    "67890123",
    "78901234",
    "89012345",
    "90123456",
    "01234567",
    "12345670"
  ],
  "notes": "Emergency contact: Alice (+1-555-0199). Recovery protocol: Recover Google account first using backup codes, then sign in to 1Password at my.1password.com."
}
```

---

## 🛡️ Core Features in `public/index.html`

1. **Minimalist Lock Screen & Live Diceware Counter**:
   - Clean, distraction-free interface free of developer jargon.
   - Real-time `X / 6 words` counter badge that turns green (`✓ 6 / 6 words`) upon entering all 6 words.
   - Masked passphrase input with quick Show/Hide toggle.
   - Streamlined button states (`Unlock Vault` and `Unlocking...`).

2. **DNS-over-HTTPS (DoH) Dead-Drop Fetcher**:
   - Secondary dead-drop hosted on `recovery.hrabcak.com` TXT record.
   - Clicking **"⚡ Fetch from recovery.hrabcak.com"** fetches the latest ciphertext via RFC 8484 DNS-over-HTTPS.
   - Dual-resolver redundancy: queries Cloudflare 1.1.1.1 first with automatic failover to Google 8.8.8.8 if blocked.
   - Automatically stitches RFC 1035 255-byte DNS chunks and populates the vault input.

3. **Staleness-Check Banner**:
   - Calculates exact elapsed time since `metadata.generatedAt`.
   - Compares with `metadata.staleAfterMonths` (defaults to 6 months).
   - Displays real-time status:
     - `FRESH` (Emerald): Valid payload with remaining days counter.
     - `EXPIRING SOON` (Amber): Warning when within 30 days of staleness threshold.
     - `STALE / EXPIRED` (Pulsating Red): Danger alert warning that backup codes or credentials may have expired or rotated.
   - Shows UTC timestamp, local time, vault age, and canary code.

4. **Single-Use Backup Code Strikethrough Tracker**:
   - Google Backup Codes are single-use 8-digit codes.
   - Clicking any code or checkbox strikes it through (`text-decoration: line-through` + dimmed opacity) and marks it as `USED`.
   - Real-time remaining count tracker (`X / Y remaining`).
   - **"⚡ Copy Next Unused Code"** button: Automatically finds the next unstruck code, copies it to clipboard, and highlights it.
   - **Session Persistence**: Strikethrough progress is preserved in `sessionStorage` (scoped to the vault's canary code) so accidental tab reloads do not lose track of burned codes.
   - **Reset Tracker**: Button to clear all strikethrough marks.

5. **Universal One-Click Copy & Untrusted Terminal Clipboard Scrubbing**:
   - Dedicated copy buttons for 1Password email, secret key, account hint, canary code, emergency notes, and each backup code.
   - Uses `navigator.clipboard.writeText` with legacy `document.execCommand('copy')` fallback for restricted kiosk environments.
   - Visual feedback (`✓ Copied! (clears in 45s)`).
   - **45s Timed Auto-Scrubbing**: Schedules an automatic clipboard wipe (overwrites with blank space `" "`) after 45 seconds to prevent next kiosk users from retrieving secrets.
   - **Focus-Catchup Scrubbing**: If the user is on another tab (e.g. Google login) when the 45s timer expires, the clipboard is immediately scrubbed upon re-focusing the recovery tab.
   - **"🧹 Clear Clipboard" Action Button**: Allows immediate manual wiping of copied credentials on demand.

6. **Hardened Edge & Memory Security**:
   - Browser-native WebCrypto API (`window.crypto.subtle`) with Unicode NFKC & whitespace normalization.
   - Strict Content Security Policy (`CSP`) restricting outbound traffic exclusively to trusted anycast DoH resolvers (`https://cloudflare-dns.com https://dns.google`).
   - **"🔒 Lock & Purge"** button: Actively scrubs the OS clipboard, completely zeroes out sensitive memory structures, clears DOM elements, resets inputs, and wipes session storage.

7. **High-Stress Emergency Paper Printout (`@media print`)**:
   - Clean, toner-saving white print format eliminating dark backgrounds, buttons, and inputs.
   - Formats 1Password secret keys, notes, and backup codes into a clean 2-column card grid with `page-break-inside: avoid`.
   - Striking indicator (`[USED]`) on burned codes and confidential header stamp.
   - One-click `🖨️ Print Sheet` button in the unlocked vault screen.

---

## 🔒 Security & GitHub Backup Rules

When backing up or hosting this project on GitHub (e.g. for the Tier 1 dead-drop):

### 1. ⚠️ CRITICAL: Never Commit Plaintext Credentials (`payload.json`)
- **Never** commit unencrypted JSON files containing real Google backup codes, 1Password secret keys, master password hints, or private contact numbers.
- A strict `.gitignore` is configured to prevent files like `payload.json`, `my-payload.json`, `*secret*`, and private environment files from ever being tracked.
- `templates/sample-payload.json` is safe to commit because it contains only dummy placeholder values.

### 2. Encrypted Ciphertext (`public/index.html`) is Safe for Dead-Drop Hosting
- The embedded payload in `public/index.html` is protected by AES-GCM-256 and PBKDF2-SHA-256 (600,000 rounds) derived from a memorized 6-word Diceware passphrase (~77 bits of entropy).
- As specified in the threat model, the ciphertext is cryptographically safe to host on GitHub and serve globally via Cloudflare or GitHub Pages.

### 3. Repository Visibility
- **Private Repository (Recommended)**: Best practice for source code backup. Cloudflare Pages connects to private GitHub repositories for free.
- **Public Repository**: Only needed if using free-tier GitHub Pages.

### 4. Offline Key Ingestion
- Always run `scripts/encrypt.js` locally on a trusted machine to generate the encrypted payload. Never paste plaintext secrets into untrusted tools or online WebCrypto playgrounds.

---

## 🌐 Deploying to Cloudflare Workers & Pages (Recommended)

Cloudflare Pages is the optimal hosting platform for this protocol because it supports **private repositories for free**, provides instant global Anycast routing (<50ms globally), automated SSL, and response-level security headers.

### Deployment Configuration
The repository is designed to be deployed using Cloudflare Pages Git integration.

1. In the **Cloudflare Dashboard**, navigate to **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
2. Authorize your private GitHub repository `identity-recovery`.
3. Configure the build settings:
   - **Framework preset:** `None`
   - **Build command:** *(leave empty)*
   - **Build output directory:** `public`
4. Click **Save and Deploy**. Your site will be live at `https://identity-recovery.pages.dev`.

> [!WARNING]
> You must set the output directory to `public`. Setting it to `.` will publicly expose your `scripts/` directory and bypass the `_headers` CSP rules!
5. **Custom Domain (`sos.<domain>.com`)**:
   - Go to your project → **Custom domains** tab → **Set up a custom domain**.
---

## ⏰ Automated Staleness Monitoring (GitHub Actions)

To prevent the common operational failure of forgetting to rotate backup codes before they expire, an automated GitHub Actions workflow is provided:

- **Workflow File:** [`.github/workflows/staleness-check.yml`](.github/workflows/staleness-check.yml)
- **Evaluator Script:** [`scripts/check-staleness.js`](scripts/check-staleness.js)
- **Cadence:** Automatically runs on a schedule (1st and 15th of every month at 09:00 UTC) and on pushes to `main`. Can also be manually triggered via `workflow_dispatch`.
- **Zero-Knowledge Architecture:** Does **not** require any decryption passphrase or secrets. Reads the non-sensitive public metadata tags (`vault-generated-at` and `vault-stale-after-months`) embedded in `public/index.html`.
- **Multi-Channel Push Notifications:** Configure `STALENESS_WEBHOOK_URL` in your GitHub repository secrets (or local `.env`) with an **[ntfy.sh](https://ntfy.sh)**, **Discord**, or **Slack** webhook URL to receive instant high-priority push notifications directly on your mobile device when rotation is due.
- **Automated Alerts:**
  - If the vault is within 30 days of expiration or stale: Opens/updates an Issue labeled `vault-staleness`, sending an automated email notification and firing your push webhook.
  - If the vault was recently rotated and fresh: Automatically closes any open staleness issues.

Run locally anytime:
```bash
node scripts/check-staleness.js
# Or test with webhook:
node scripts/check-staleness.js --webhook https://ntfy.sh/your_topic
```

---

## 📁 Project File Index

| File | Purpose | Security / Privacy Classification |
|---|---|---|
| [`public/index.html`](public/index.html) | Standalone recovery terminal UI with zero-dependency WebCrypto AES-GCM decryption, staleness banner, copy buttons, and backup code strikethrough tracker. | Public / Deployable (contains only encrypted ciphertext) |
| [`public/_headers`](public/_headers) | Cloudflare HTTP response headers enforcing CSP, anti-clickjacking (`DENY`), `no-store` cache control, and HSTS. | Web Infrastructure (Edge Security) |
| [`scripts/deploy.sh`](scripts/deploy.sh) | Hardened Bash deployment script: validates payload, ingests passphrase with typo confirmation, embeds ciphertext, tests, commits, pushes, and shreds plaintext. | Private Tooling (Automation) |
| [`scripts/encrypt.js`](scripts/encrypt.js) | Node.js 18+ CLI utility to derive PBKDF2-600k keys, encrypt JSON payloads, inject Base64 into `public/index.html`, or verify offline decryption. | Private Tooling (Zero npm dependencies) |
| [`scripts/check-staleness.js`](scripts/check-staleness.js) | Evaluates vault freshness and outputs status for GitHub Actions alerting without decrypting ciphertext. | Private Tooling (Zero npm dependencies) |
| [`.github/workflows/staleness-check.yml`](.github/workflows/staleness-check.yml) | Scheduled GitHub Actions workflow monitoring vault age and opening automated alert issues. | CI/CD Automation |
| [`templates/sample-payload.json`](templates/sample-payload.json) | Dummy schema-compliant template payload for testing. | Dummy Data (Safe to commit) |
| [`tests/test-suite.js`](tests/test-suite.js) | Automated test suite validating cryptographic parity, error handling, staleness calculations, and CSP rules. | Verification |
| [`.env.example`](.env.example) | Environment template documenting configurable variables like `RECOVERY_DOMAIN`. | Configuration Template |
| [`.gitignore`](.gitignore) | Enforces that real unencrypted `payload.json`, secrets, and temporary ciphertext dumps are never committed to Git. | Security Boundary |
| [`SPEC.md`](SPEC.md) | Architectural specification, cryptographic definitions, schema, and threat model. | Documentation |
| [`README.md`](README.md) | Operational guide, quick run commands, security rules, and deployment instructions. | Documentation |
