# Cold-Start Identity Recovery Protocol

Stateless, zero-hardware emergency credential recovery protocol designed to restore primary identity and root-of-trust access from an untrusted terminal or newly procured device anywhere in the world.

- **Root of Trust:** 1Password (holds all credentials, Google backup codes, and downstream accounts).
- **Primary Identity:** Google (@gmail.com with 2SV enabled).
- **Disaster Scenario:** Total physical hardware loss (no phone, no YubiKey, no wallet, no trusted devices).
- **Cryptography:** AES-GCM-256 with PBKDF2-SHA-256 (600,000 iterations, 16-byte random salt, 12-byte random IV).
- **Key Material:** Memorized 6-word Diceware passphrase (~77 bits entropy).
- **Runtime:** Standalone, single-file zero-dependency `index.html` using browser-native WebCrypto (`window.crypto.subtle`).
- **Hosting Target:** Cloudflare Pages / Workers (recommended) or GitHub Pages served over HTTPS via custom domain (`sos.<domain>.com`).

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
|  node encrypt.js --embed-html index.html                                |
|    - PBKDF2-SHA-256 (600,000 rounds) + 16-byte salt                     |
|    - AES-GCM-256 Encryption + 12-byte IV                                |
|    - Produces Base64: [16b salt][12b IV][ciphertext + 16b tag]          |
|    - Injects into index.html                                            |
|         |                                                               |
|         v                                                               |
|  git push origin main (Private GitHub Repo)                             |
+-------------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------------+
| CLOUDFLARE EDGE (Anycast Global CDN)                                    |
|                                                                         |
|  - Reads wrangler.json & .assetsignore                                  |
|  - Deploys static assets globally (<50ms cold load anywhere in world)   |
|  - Serves _headers (Strict CSP, HSTS, no-store, anti-clickjacking)      |
|  - Accessible at: https://sos.<domain>.com                              |
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
To rotate your credentials, verify the crypto, commit strictly `index.html`, push to Cloudflare, and securely shred the unencrypted JSON payload in a single hardened command:
```bash
./deploy.sh [path-to-payload.json]
```
*(If no payload file is passed as an argument, it automatically uses `payload.json` or prompts for a path. In Step 7, secure plaintext shredding defaults to **Yes**).*

---

### Manual Step-by-Step Workflow

#### 1. Generate a Sample Recovery Payload
Generate a template `sample-payload.json` matching the specification schema:
```bash
# Generate a fresh sample payload (generated 5 days ago)
node encrypt.js --sample fresh

# Or generate a stale sample payload (generated 7 months ago) to test the warning banner
node encrypt.js --sample stale
```

### 2. Encrypt & Embed Directly into `index.html`
Derive key material via PBKDF2 (600,000 iterations), encrypt the payload with AES-GCM-256, and inject the Base64 ciphertext into `index.html`:
```bash
node encrypt.js -i sample-payload.json -p "correct horse battery staple zebra guitar" --embed-html index.html
```

### 3. Encrypt to Standalone Output File or Terminal
```bash
# Output base64 ciphertext to file
node encrypt.js -i sample-payload.json -p "correct horse battery staple zebra guitar" -o ciphertext.b64

# Print base64 ciphertext directly to stdout
node encrypt.js -i sample-payload.json -p "correct horse battery staple zebra guitar"
```

### 4. Verify Decryption via CLI
Verify that a ciphertext string decrypts correctly with the passphrase:
```bash
node encrypt.js --decrypt "$(cat ciphertext.b64)" -p "correct horse battery staple zebra guitar"
```

### 5. Run the Automated Test Suite
Execute end-to-end cryptographic parity, staleness logic, corrupted payload rejection, and zero-dependency checks:
```bash
node test-suite.js
```

### 6. Preview / Test Recovery Terminal Locally
Because `index.html` is strictly self-contained with no external dependencies or runtime network calls, you can open it directly in any browser:
```bash
# Direct browser opening (Linux)
xdg-open index.html

# Or serve via lightweight local HTTP server
python3 -m http.server 8080
# Open http://localhost:8080 in your browser
```

---

## 📋 Payload Schema (`sample-payload.json`)

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

## 🛡️ Core Features in `index.html`

1. **Staleness-Check Banner**:
   - Calculates exact elapsed time since `metadata.generatedAt`.
   - Compares with `metadata.staleAfterMonths` (defaults to 6 months).
   - Displays real-time status:
     - `FRESH` (Emerald): Valid payload with remaining days counter.
     - `EXPIRING SOON` (Amber): Warning when within 30 days of staleness threshold.
     - `STALE / EXPIRED` (Pulsating Red): Danger alert warning that backup codes or credentials may have expired or rotated.
   - Shows UTC timestamp, local time, vault age, and canary code.

2. **Single-Use Backup Code Strikethrough Tracker**:
   - Google Backup Codes are single-use 8-digit codes.
   - Clicking any code or checkbox strikes it through (`text-decoration: line-through` + dimmed opacity) and marks it as `USED`.
   - Real-time remaining count tracker (`X / Y remaining`).
   - **"⚡ Copy Next Unused Code"** button: Automatically finds the next unstruck code, copies it to clipboard, and highlights it.
   - **Session Persistence**: Strikethrough progress is preserved in `sessionStorage` (scoped to `recovery_used_codes_<canaryCode>`) so accidental tab reloads do not lose track of burned codes.
   - **Reset Tracker**: Button to clear all strikethrough marks.

3. **Universal One-Click Copy Buttons**:
   - Dedicated copy buttons for 1Password email, secret key, account hint, canary code, emergency notes, and each backup code.
   - Uses `navigator.clipboard.writeText` with legacy `document.execCommand('copy')` fallback for restricted kiosk environments.
   - Visual feedback (`✓ Copied!`) on the clicked button.

4. **Zero-Dependency Security**:
   - Browser-native WebCrypto API (`window.crypto.subtle`).
   - Strict Content Security Policy (`CSP`) meta tag blocking all external requests, styles, and scripts.
   - **"🔒 Lock & Purge"** button: Completely zeroes out sensitive memory structures, clears DOM elements, resets inputs, and wipes session storage.

---

## 🔒 Security & GitHub Backup Rules

When backing up or hosting this project on GitHub (e.g. for the Tier 1 dead-drop):

### 1. ⚠️ CRITICAL: Never Commit Plaintext Credentials (`payload.json`)
- **Never** commit unencrypted JSON files containing real Google backup codes, 1Password secret keys, master password hints, or private contact numbers.
- A strict `.gitignore` is configured to prevent files like `payload.json`, `my-payload.json`, `*secret*`, and private environment files from ever being tracked.
- `sample-payload.json` is safe to commit because it contains only dummy placeholder values.

### 2. Encrypted Ciphertext (`index.html`) is Safe for Dead-Drop Hosting
- The embedded payload in `index.html` is protected by AES-GCM-256 and PBKDF2-SHA-256 (600,000 rounds) derived from a memorized 6-word Diceware passphrase (~77 bits of entropy).
- As specified in the threat model, the ciphertext is cryptographically safe to host on GitHub and serve globally via Cloudflare or GitHub Pages.

### 3. Repository Visibility
- **Private Repository (Recommended)**: Best practice for source code backup. Cloudflare Pages connects to private GitHub repositories for free.
- **Public Repository**: Only needed if using free-tier GitHub Pages.

### 4. Offline Key Ingestion
- Always run `encrypt.js` locally on a trusted machine to generate the encrypted payload. Never paste plaintext secrets into untrusted tools or online WebCrypto playgrounds.

---

## 🌐 Deploying to Cloudflare Workers & Pages (Recommended)

Cloudflare Pages is the optimal hosting platform for this protocol because it supports **private repositories for free**, provides instant global Anycast routing (<50ms globally), automated SSL, and response-level security headers.

### Deployment Configuration
The repository includes pre-configured [`wrangler.json`](wrangler.json), [`_headers`](_headers), and [`.assetsignore`](.assetsignore) files.

1. In the **Cloudflare Dashboard**, navigate to **Workers & Pages** → **Create application** → **Connect to Git**.
2. Authorize your private GitHub repository `identity-recovery`.
3. Configure the build settings:
   - **Framework preset:** `None`
   - **Build command:** *(leave empty)*
   - **Deploy command:** `npx wrangler deploy` (or leave default)
   - **Build output directory / Root directory:** `.`
4. Click **Save and Deploy**. Your site will be live at `https://identity-recovery.pages.dev`.
5. **Custom Domain (`sos.<domain>.com`)**:
   - Go to your project → **Custom domains** tab → **Set up a custom domain**.
   - Enter `sos.<yourdomain>.com`. Cloudflare will automatically configure the DNS record and TLS certificate.
6. **Security Headers**: The committed `_headers` file automatically applies strict CSP, HSTS, `no-store` cache control, and anti-clickjacking headers to all requests.

---

## 📁 Project File Index

| File | Purpose | Security / Privacy Classification |
|---|---|---|
| [`index.html`](index.html) | Standalone recovery terminal UI with zero-dependency WebCrypto AES-GCM decryption, staleness banner, copy buttons, and backup code strikethrough tracker. | Public / Deployable (contains only encrypted ciphertext) |
| [`deploy.sh`](deploy.sh) | Hardened Bash deployment script: validates payload, ingests passphrase with typo confirmation, embeds ciphertext, tests, commits, pushes, and shreds plaintext. | Private Tooling (Automation) |
| [`encrypt.js`](encrypt.js) | Node.js 18+ CLI utility to derive PBKDF2-600k keys, encrypt JSON payloads, inject Base64 into `index.html`, or verify offline decryption. | Private Tooling (Zero npm dependencies) |
| [`SPEC.md`](SPEC.md) | Architectural specification, cryptographic definitions, schema, and threat model. | Documentation |
| [`README.md`](README.md) | Operational guide, quick run commands, security rules, and deployment instructions. | Documentation |
| [`_headers`](_headers) | Cloudflare HTTP response headers enforcing CSP, anti-clickjacking (`DENY`), `no-store` cache control, and HSTS. | Web Infrastructure |
| [`wrangler.json`](wrangler.json) | Cloudflare Workers & Pages configuration defining static assets directory. | Deployment Configuration |
| [`.assetsignore`](.assetsignore) | Instructs Cloudflare to publish only `index.html` and `_headers`, keeping scripts and documentation off the public web root. | Deployment Filter |
| [`sample-payload.json`](sample-payload.json) | Dummy schema-compliant template payload for testing. | Dummy Data (Safe to commit) |
| [`test-suite.js`](test-suite.js) | Automated test suite validating cryptographic parity, error handling, staleness calculations, and CSP rules. | Verification |
| [`.gitignore`](.gitignore) | Enforces that real unencrypted `payload.json`, secrets, and temporary ciphertext dumps are never committed to Git. | Security Boundary |
