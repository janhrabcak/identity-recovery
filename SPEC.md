# Project Specification: Cold-Start Identity Recovery Protocol

## 1. System Overview & Constraints
- **Root of Trust:** 1Password (holds all credentials, Google backup codes, and downstream accounts).
- **Primary Identity:** Google (@gmail.com, standard consumer account with 2SV enabled).
- **Disaster Scenario:** Total hardware and physical loss ("lost everything", no phone, no YubiKey, no wallet).
- **Recovery Requirement:** Global, location-independent recovery from an untrusted terminal or newly procured retail device.

---

## 2. Recovery Architecture: Tier 1 Stateless Encrypted Dead-Drop

### 2.1 Hosting Target & Runtime Model
- **Primary Hosting Target:** Cloudflare Pages / Workers (recommended) or GitHub Pages served over HTTPS via custom domain (`sos.<domain>.com`).
- **Secondary Dead-Drop:** RFC 1035 DNS TXT record hosted on `recovery.hrabcak.com`, queryable via RFC 8484 DNS-over-HTTPS (DoH) through public anycast resolvers (`cloudflare-dns.com` and `dns.google`) or standard terminal DNS utilities (`dig`, `nslookup`).
- **Runtime Model:** Standalone, single-file zero-dependency `public/index.html` executing pure browser-native WebCrypto (`window.crypto.subtle`). No external CDNs, JavaScript frameworks, or remote fonts. Network egress is restricted exclusively to public DoH resolvers.

### 2.2 Repository Organization
```text
identity-recovery/
├── public/                       # 🌐 Public edge deployment (Cloudflare Pages / Workers)
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
│   └── test-suite.js             # Automated crypto & parity tests (8 automated tests)
│
├── wrangler.json                 # Cloudflare config: assets directory -> "./public"
├── .gitignore                    # Security boundary (blocks unencrypted payload.json)
├── README.md                     # Operational documentation & quick run commands
└── SPEC.md                       # Full cryptographic & architectural specification
```

### 2.3 Cryptographic Specification
- **Cipher:** AES-GCM-256 (authenticated encryption with 128-bit authentication tag).
- **Initialization Vector (IV):** 12 bytes (96 bits), cryptographically secure random (`crypto.getRandomValues`).
- **Key Derivation Function (KDF):** PBKDF2 with HMAC-SHA-256.
  - **Iterations:** 600,000 rounds (exceeding OWASP password storage recommendations).
  - **Salt:** 16 bytes (128 bits), cryptographically secure random.
- **Key Material:** Memorized 6-word Diceware passphrase (~77 bits of entropy), strictly distinct from the 1Password master password.
- **Serialized Binary Format:**
  ```text
  [16-byte Salt] || [12-byte IV] || [Ciphertext + 16-byte Auth Tag]
  ```
  Encoded as standard RFC 4648 Base64 string.

### 2.4 Payload Schema
```json
{
  "metadata": {
    "generatedAt": "ISO-8601 UTC timestamp",
    "staleAfterMonths": 6,
    "canaryCode": "12345678"
  },
  "onePassword": {
    "email": "user@example.com",
    "secretKey": "XX-XXXXXX-XXXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
    "accountKeyHint": "Hint string"
  },
  "googleBackupCodes": [
    "23456789",
    "34567890",
    "..."
  ],
  "notes": "Emergency numbers, trusted contacts, and secondary recovery steps"
}
```

---

## 3. Client-Side Runtime & Recovery Interface (`public/index.html`)

### 3.1 Decryption Engine
- Executes asynchronously using WebCrypto `window.crypto.subtle`.
- Decoupled from the DOM event loop using a deferred dispatch (`setTimeout(..., 20)`) to render loading indicators prior to executing the 600,000-round PBKDF2 derivation.
- Authenticated decryption failure (e.g. incorrect passphrase or corrupted data) caught via `OperationError` and reported clearly without crashing the page.

### 3.2 Staleness Verification Engine
The client dynamically inspects `metadata.generatedAt` against the terminal's system time:
- **Elapsed Time Formula:** $\Delta t = t_{\text{current}} - t_{\text{generatedAt}}$ in days and months ($30.4375\text{ days/month}$).
- **Staleness Deadline:** $t_{\text{deadline}} = t_{\text{generatedAt}} + \text{staleAfterMonths}$.
- **States & Visual Badges:**
  1. **`FRESH` (Emerald):** $\Delta t \le (\text{threshold} - 30\text{ days})$. Vault is verified fresh with exact remaining days displayed.
  2. **`EXPIRING SOON` (Amber):** Within 30 days of the staleness deadline. Warns user that codes will soon reach their rotation window.
  3. **`STALE / EXPIRED` (Pulsating Red Alert):** Vault age exceeds `staleAfterMonths`. Issues a critical warning that single-use backup codes, passwords, or secret keys may have been rotated or invalidated.
- **Canary Code:** Displays `metadata.canaryCode` with a dedicated copy button, allowing rapid verification against 2SV prompts without exposing recovery codes.

### 3.3 Single-Use Backup Code Tracker
Google 2SV backup codes are single-use. Re-entering consumed codes burns recovery attempts on untrusted terminals:
- **Visual Strikethrough:** Clicking any code card or checkbox strikes through the code digits (`text-decoration: line-through`), dims opacity (0.45), and flags it as `USED`.
- **Remaining Counter:** Real-time indicator displaying active unused codes (`X / Y remaining`).
- **Next Unused Code Selector:** An action button (`⚡ Copy Next Unused Code`) that identifies the lowest-index unstruck code, copies it to clipboard, scrolls it into view, and highlights it with an animated outline.
- **Ephemeral Session Persistence:** Strikethrough status is persisted in `sessionStorage` under a key scoped to the vault canary (`recovery_used_codes_<canaryCode>`). If the recovery terminal tab is refreshed or reloaded during 2SV navigation, marked codes are preserved.
- **Reset Trigger:** Allows clearing all strikethrough markers if needed.

### 3.4 Universal One-Click Copy Mechanics
- Universal helper supporting all sensitive fields (Email, Secret Key, Canary Code, Notes, individual backup codes, and raw JSON export).
- **Dual-Mode Implementation:** Uses `navigator.clipboard.writeText` with an automatic fallback to an ephemeral hidden `<textarea>` + `document.execCommand('copy')` for restricted kiosk browser contexts.
- **Visual Confirmation:** Button displays `✓ Copied!` and highlights green for 1.8 seconds before reverting.

### 3.5 Emergency Purge & Memory Wiping ("Lock & Purge")
- Clicking **"🔒 Lock & Purge"** immediately:
  1. Overwrites and nullifies the in-memory payload reference (`currentPayload = null`).
  2. Clears all tracked backup code indices.
  3. Replaces all DOM text nodes containing decrypted credentials with placeholders (`-`).
  4. Clears the passphrase input value and resets the live word counter badge.
  5. Cleans up `sessionStorage`.
  6. Returns the UI to the locked screen state.

### 3.6 DNS-over-HTTPS (DoH) Secondary Dead-Drop Fetcher
- Allows on-demand retrieval of the encrypted ciphertext directly from the `recovery.hrabcak.com` DNS TXT record.
- **Dual Anycast Resolver Redundancy:** Queries Cloudflare DoH (`https://cloudflare-dns.com/dns-query`) first with automated failover to Google Public DoH (`https://dns.google/resolve`).
- **RFC 1035 Chunk Stitching:** Normalizes and stitches multiple 255-byte DNS text chunks into the unified RFC 4648 Base64 ciphertext string.

### 3.7 Minimalist Lock Screen & Live Diceware Counter
- Low-stress, distraction-free interface eliminating cryptographic jargon and developer noise.
- Live `X / 6 words` counter badge that highlights green (`✓ 6 / 6 words`) upon entering all 6 words to prevent whitespace and counting mistakes.
- Masked input with instant Show/Hide toggle.
- Streamlined button states (`Unlock Vault` and `Unlocking...`).

---

## 4. Threat Model & Security Controls

### 4.1 Untrusted Terminal Mitigations
- **Content Security Policy (CSP):**
  ```http
  default-src 'none'; connect-src https://cloudflare-dns.com https://dns.google; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none';
  ```
  Outbound network access is strictly locked down: all external scripts, styles, objects, workers, frames, and arbitrary network destinations are completely blocked. `connect-src` is restricted exclusively to trusted public anycast DoH resolvers (`cloudflare-dns.com` and `dns.google`) solely for secondary dead-drop ciphertext retrieval. Decrypted secrets can never be exfiltrated to arbitrary servers.
- **HTTP Response Security Headers (`public/_headers`):**
  - `X-Frame-Options: DENY`: Defends against iframe overlay and clickjacking attacks.
  - `Cache-Control: no-cache, no-store, must-revalidate`: Prevents public kiosk or retail terminals from writing decrypted content to disk cache.
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`: Enforces strict TLS.
  - `Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=(), usb=()`: Revokes all unnecessary browser device capabilities.
  - `X-Content-Type-Options: nosniff`: Prevents MIME-type sniffing.
- **DOM XSS Protection:** Decrypted strings are injected solely via `textContent` or text node creation—never via `innerHTML` or string interpolation.
- **No Disk Persistence:** Unencrypted payload data is never written to `localStorage` or IndexedDB. Only ephemeral used-code indices are stored in `sessionStorage` (scoped to `recovery_used_codes_<canaryCode>`).
- **Memory Purge Protocol:** The "Lock & Purge" procedure nullifies JavaScript heap references, wipes DOM nodes, and clears session storage.

### 4.2 Dead-Drop Storage & Edge Asset Isolation
- **Public vs. Private Repository:**
  - Plaintext credential files (`payload.json`) are barred by `.gitignore`.
  - The embedded Base64 ciphertext in `public/index.html` is cryptographically secure against offline brute-force attacks assuming $\ge 77$ bits entropy (PBKDF2 600k rounds + AES-GCM-256).
- **Physical Edge Isolation (`wrangler.json`):**
  - Cloudflare deployment publishes strictly `./public` (`index.html` and `_headers`). Internal tools (`scripts/encrypt.js`, `scripts/deploy.sh`, test suites, specification docs) are physically separated and never uploaded to the public web root.

---

## 5. Offline Ingestion & Deployment Tooling

### 5.1 Encryption Utility (`scripts/encrypt.js`)
- **Environment:** Node.js 18+ standard library using `node:crypto` (`subtle` and `getRandomValues`). Zero third-party npm packages.
- **Command-Line Interface:**
  - `--sample [fresh|stale]`: Creates a schema-compliant `templates/sample-payload.json`.
  - `-i, --input <file>`: Reads plaintext JSON payload.
  - `-p, --passphrase <phrase>`: Accepts Diceware passphrase (masked interactive prompt if omitted).
  - `-o, --output <file>`: Writes Base64 ciphertext to file.
  - `--embed-html <file>`: Automatically injects the Base64 ciphertext into `const EMBEDDED_CIPHERTEXT = "..."` within `public/index.html`.
  - `--decrypt <base64>`: Decrypts and outputs formatted JSON to verify payload integrity offline.

### 5.2 Automated Deployment Script (`scripts/deploy.sh`)
Hardened Bash orchestration script for rotation and production publishing:
1. **Pre-flight Checks:** Validates git repository, remote connectivity, and payload schema completeness.
2. **Passphrase Ingestion:** Prompts for Diceware passphrase with masked input and typo-prevention confirmation.
3. **Encryption & HTML Embedding:** Invokes `scripts/encrypt.js` to derive PBKDF2-600k keys and inject the Base64 ciphertext into `public/index.html`.
4. **Pre-Deploy Verification:** Executes `tests/test-suite.js` to guarantee cryptographic and runtime validity before staging.
5. **Git Safety Guard:** Audits git staging area to prevent accidental credential leaks; stages strictly `public/index.html`.
6. **Commit & Push:** Commits with UTC timestamp and pushes to `origin main`, triggering Cloudflare Anycast edge deployment.
7. **Plaintext Destruction & DNS Dead-Drop Info:** Securely shreds and unlinks the plaintext payload file using `shred -u -z -n 3` (3-pass random overwrite + zero fill, defaulting to **Yes**), and outputs the formatted DNS TXT record for `recovery.hrabcak.com`.

### 5.3 Automated Staleness Monitoring (`scripts/check-staleness.js`, `.github/workflows/staleness-check.yml`)
- **Zero-Knowledge Principle:** Evaluates vault age without accessing private key material or decrypting ciphertext by reading the public `<meta name="vault-generated-at">` tag in `public/index.html`.
- **Scheduled CI Automation:** Runs on the 1st and 15th of every month via GitHub Actions (`cron: '0 9 1,15 * *'`).
- **Issue Lifecycle Management:**
  - Automatically creates/updates an issue labeled `vault-staleness` when the vault is within 30 days of staleness or expired.
  - Automatically closes open staleness issues when a newly rotated vault is deployed (`status == FRESH`).

---

## 6. Verification Suite (`tests/test-suite.js`)

Automated test runner verifying:
1. End-to-end cryptographic parity between Node WebCrypto and browser WebCrypto.
2. Rejection of invalid passphrases via AES-GCM authentication tag failure.
3. Rejection of corrupted or tampered ciphertext bytes.
4. Staleness classification logic (`FRESH`, `EXPIRING_SOON`, `STALE`).
5. Zero-dependency integrity check verifying no external scripts, CDNs, or styles exist in `public/index.html`.
6. Automated HTML embedding regex verification.
7. Staleness evaluator unit tests (`scripts/check-staleness.js`) across all freshness states.
8. DNS-over-HTTPS (DoH) multi-chunk parsing logic parity across Cloudflare and Google DoH formats.
