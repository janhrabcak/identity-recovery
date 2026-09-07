# Cold-Start Identity Recovery Protocol

Stateless, zero-hardware emergency credential recovery protocol designed to restore primary identity and root-of-trust access from an untrusted terminal or newly procured device.

- **Root of Trust:** 1Password (holds all credentials, Google backup codes, and downstream accounts).
- **Primary Identity:** Google (@gmail.com with 2SV enabled).
- **Cryptography:** AES-GCM-256 with PBKDF2-SHA-256 (600,000 iterations, 16-byte random salt, 12-byte random IV).
- **Runtime:** Single, self-contained `index.html` with zero external dependencies, no remote CDNs/fonts, and strict Content Security Policy (CSP).

---

## 🚀 Quick Run Commands

### 1. Generate a Sample Recovery Payload
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

### 6. Open / Serve Recovery Terminal
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
   - **Session Persistence**: Strikethrough progress is preserved in `sessionStorage` (scoped to the vault's canary code) so accidental tab reloads do not lose track of burned codes.
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

When backing up or hosting this project on GitHub (e.g. for the Tier 1 GitHub Pages dead-drop):

### 1. ⚠️ CRITICAL: Never Commit Plaintext Credentials (`payload.json`)
- **Never** commit unencrypted JSON files containing real Google backup codes, 1Password secret keys, master password hints, or private contact numbers.
- A strict `.gitignore` is configured to prevent files like `payload.json`, `my-payload.json`, `*secret*`, and private environment files from ever being tracked.
- `sample-payload.json` is safe to commit because it contains only dummy placeholder values.

### 2. Encrypted Ciphertext (`index.html`) is Safe for Public Dead-Drop
- The embedded payload in `index.html` is protected by AES-GCM-256 and PBKDF2-SHA-256 (600,000 rounds) derived from a memorized 6-word Diceware passphrase (~77 bits of entropy).
- As specified in the threat model, the ciphertext is cryptographically safe to host on GitHub (and serve over GitHub Pages at `sos.<domain>.com`).

### 3. Repository Visibility Options
- **Private Repository (Recommended)**: Best practice for source code backup. If you have GitHub Pro or Enterprise, GitHub Pages can be served privately or restricted.
- **Public Repository**: Required only if hosting GitHub Pages on a free GitHub account. The encrypted ciphertext is designed to resist offline attacks, but ensure your passphrase has high entropy.

### 4. Offline Key Ingestion
- Always run `encrypt.js` locally on a trusted machine to generate the encrypted payload. Never paste plaintext secrets into untrusted tools or online WebCrypto playgrounds.

---

## 📦 Backing Up to GitHub

```bash
# 1. Initialize git and stage safe files
git init
git add .
git commit -m "feat: Cold-Start Identity Recovery Protocol implementation"

# 2. Push to personal GitHub via gh CLI

# Option A: Private repository (recommended)
gh repo create identity-recovery --private --source=. --remote=origin --push

# Option B: Public repository (if deploying directly to free GitHub Pages)
gh repo create identity-recovery --public --source=. --remote=origin --push
```
