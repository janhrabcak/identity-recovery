# Project Specification: Cold-Start Identity Recovery Protocol

## 1. System Overview & Constraints
- **Root of Trust:** Primary Password Manager (e.g. 1Password, Bitwarden, KeePassXC — holds master credentials, keys, and downstream accounts).
- **Primary Identity:** Primary Identity Provider (e.g. Google, Apple, Microsoft, Proton with 2SV enabled).
- **Disaster Scenario:** Total hardware and physical loss ("lost everything", no phone, no YubiKey, no wallet).
- **Recovery Requirement:** Global, location-independent recovery from an untrusted terminal or newly procured retail device.

---

## 2. Recovery Architecture: Tier 1 Stateless Encrypted Dead-Drop

### 2.1 Hosting Target & Runtime Model
- **Primary Hosting Target:** Cloudflare Pages / Workers (recommended) or GitHub Pages served over HTTPS via custom domain (`sos.<domain>.com`).
- **Secondary Dead-Drop:** RFC 1035 DNS TXT record hosted on `recovery.<domain>.com` (configurable, default: `recovery.yourdomain.com`), queryable via RFC 8484 DNS-over-HTTPS (DoH) through public anycast resolvers (`cloudflare-dns.com` and `dns.google`) or standard terminal DNS utilities (`dig`, `nslookup`).
- **Runtime Model:** Standalone, single-file zero-dependency `public/index.html` executing pure browser-native WebCrypto (`window.crypto.subtle`). No external CDNs, JavaScript frameworks, or remote fonts. Network egress is restricted exclusively to public DoH resolvers.

### 2.2 Repository Organization
```text
identity-recovery/
├── public/                       # 🌐 Public edge deployment (Cloudflare Pages / Workers / Netlify / Vercel)
│   ├── index.html                # Recovery terminal client (contains encrypted ciphertext)
│   └── _headers                  # HTTP security headers (CSP, HSTS, no-store, anti-clickjacking)
│
├── tools/                        # 🖥️ Offline client-side browser tools
│   └── builder.html              # Standalone web compiler to generate index.html offline
│
├── scripts/                      # 🛠️ Private offline tools (runs on trusted machine only)
│   ├── build-builder.js          # Generator script to refresh tools/builder.html
│   ├── deploy.sh                 # Hardened 7-step rotation & publish pipeline (Direct Upload or Git)
│   ├── encrypt.js                # WebCrypto AES-GCM / PBKDF2 offline CLI
│   ├── check-staleness.js        # Zero-knowledge staleness evaluator for CI
│   └── providers/                # 🔌 Pluggable hosting provider framework (Cloudflare, Netlify, Vercel, etc.)
│
├── .github/workflows/            # ⏰ CI & scheduled monitoring
│   ├── ci.yml                    # Automated matrix CI testing (Node 18, 20, 22)
│   └── staleness-check.yml       # Monthly automated staleness alert workflow
│
├── docs/                         # 📖 In-depth guides
│   ├── DEPLOYMENT.md             # Cloudflare Pages, Netlify, Vercel, Caddy, Nginx & DNS setup
│   ├── CLI_REFERENCE.md          # Manual CLI flags & offline workflow
│   └── FEATURES.md               # UI features (TOTP, QR, panic keybind)
│
├── templates/                    # 📋 Safe dummy templates
│   └── sample-payload.json       # Template recovery schema
│
├── tests/                        # 🧪 Verification suite
│   └── test-suite.js             # Automated crypto & parity tests (20 automated tests)
│
├── wrangler.toml                 # Cloudflare Pages configuration
├── vercel.json                   # Vercel edge security header configuration
├── netlify.toml                  # Netlify edge security header configuration
├── .env.example                  # Environment configuration template (RECOVERY_DOMAIN)
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
- **Key Material:** Memorized Diceware passphrase (minimum 6 words for ~60–77 bits entropy, recommended 8 words for ~80 bits entropy with built-in dictionary), strictly distinct from your password manager master password.
  - **Entropy Validation Rules:** Validated at generation time for $\ge 6$ whitespace-delimited words (minimum required; $\ge 8$ words categorized as "Strong"), $\ge 20$ characters total length, $\ge 4$ unique words, and $\ge 2$ characters per token.
  - **Normalization:** Passphrases undergo Unicode NFKC normalization, leading/trailing whitespace trimming, and collapse of consecutive whitespace (`\s+` to `\u0020`) before key derivation to guarantee consistency across terminals.
- **Serialized Binary Format:**
  ```text
  [16-byte Salt] || [12-byte IV] || [Ciphertext + 16-byte Auth Tag]
  ```
  Encoded as standard RFC 4648 Base64 string.

### 2.4 Payload Schema
The payload supports a modular, block-based card architecture via an `items` array, allowing arbitrary combinations of password managers, multi-service backup codes, seed phrases, TOTP authenticators, and custom key-value entries. Legacy root fields (`onePassword`, `googleBackupCodes`, `totpSeeds`, `notes`) remain supported for seamless backward compatibility.

```json
{
  "metadata": {
    "generatedAt": "ISO-8601 UTC timestamp",
    "staleAfterMonths": 6,
    "canaryCode": "12345678"
  },
  "items": [
    {
      "id": "card-pm-1",
      "type": "password_manager",
      "title": "Root of Trust: 1Password",
      "service": "1Password",
      "email": "user@example.com",
      "secretKey": "XX-XXXXXX-XXXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
      "hint": "Personal Emergency Vault",
      "instructions": "1. Go to https://my.1password.com\n2. Enter credentials"
    },
    {
      "id": "card-codes-google",
      "type": "backup_codes",
      "title": "Google 2SV Backup Codes",
      "service": "Google",
      "codes": ["23456789", "34567890", "..."]
    },
    {
      "id": "card-totp",
      "type": "totp_group",
      "title": "Live Authenticator (TOTP)",
      "seeds": {
        "Google": "JBSWY3DPEHPK3PXP",
        "GitHub": "KVKFKRCPI5UHIZKS"
      }
    },
    {
      "id": "card-seed",
      "type": "seed_phrase",
      "title": "Ledger Hardware Wallet",
      "service": "Ledger",
      "phrase": "witch collapse practice feed shame open despair creek road again ice least"
    },
    {
      "id": "card-custom-kv",
      "type": "key_value",
      "title": "Server SSH & PGP Keys",
      "entries": [
        { "label": "Root SSH Key", "value": "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5..." }
      ]
    },
    {
      "id": "card-notes",
      "type": "notes",
      "title": "Emergency Instructions & Contacts",
      "content": "Emergency contacts, trusted phone numbers, and secondary recovery steps"
    }
  ],
  "onePassword": {
    "email": "user@example.com",
    "secretKey": "XX-XXXXXX-XXXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
    "accountKeyHint": "Hint string"
  },
  "totpSeeds": {
    "Google": "JBSWY3DPEHPK3PXP",
    "GitHub": "KVKFKRCPI5UHIZKS"
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

### 3.4 Universal One-Click Copy Mechanics & Clipboard Auto-Scrubbing
- Universal helper supporting all sensitive fields (Email, Secret Key, Canary Code, Notes, individual backup codes, and raw JSON export).
- **Dual-Mode Implementation:** Uses `navigator.clipboard.writeText` with an automatic fallback to an ephemeral hidden `<textarea>` + `document.execCommand('copy')` for restricted kiosk browser contexts.
- **Visual Confirmation:** Button displays `✓ Copied! (clears in 45s)` and highlights green before reverting.
- **Untrusted Terminal Auto-Scrubbing (45s Timer):** Upon copying any credential, an ephemeral 45-second timer (`CLIPBOARD_SCRUB_TIMEOUT_MS = 45000`) is scheduled. When expired, the OS clipboard is actively overwritten with blank space (`" "`) to prevent credential theft by subsequent kiosk users.
- **Focus-Catchup Scrubbing:** If the user switches away to another browser tab (e.g. completing Google 2SV) while the timer lapses, the scrub triggers immediately the moment the recovery terminal tab regains window focus.
- **Manual Scrubbing:** A dedicated `🧹 Clear Clipboard` button allows users to immediately overwrite clipboard content on demand.

### 3.5 Emergency Purge & Memory Wiping ("Lock & Purge")
- Clicking **"🔒 Lock & Purge"** immediately:
  1. Overwrites and scrubs the OS clipboard (`scrubClipboard("lock_purge")`).
  2. Overwrites and nullifies the in-memory payload reference (`currentPayload = null`).
  3. Clears all tracked backup code indices.
  4. Replaces all DOM text nodes containing decrypted credentials with placeholders (`-`).
  5. Clears the passphrase input value and resets the live word counter badge.
  6. Cleans up `sessionStorage`.
  7. Returns the UI to the locked screen state.

### 3.6 DNS-over-HTTPS (DoH) Secondary Dead-Drop Fetcher
- Allows on-demand retrieval of the encrypted ciphertext directly from the recovery DNS TXT record.
- **Configurable Domain Hierarchy:**
  1. URL Query Parameter (`?dns=recovery.yourdomain.com` overrides without code modification)
  2. HTML Meta Tag (`<meta name="recovery-dns-domain" content="...">`)
  3. Build/Deployment Environment (`RECOVERY_DOMAIN` in `.env` or CLI)
  4. Default Fallback (`recovery.yourdomain.com`)
- **Dual Anycast Resolver Redundancy:** Queries Cloudflare DoH (`https://cloudflare-dns.com/dns-query`) first with automated failover to Google Public DoH (`https://dns.google/resolve`).
- **RFC 1035 Chunk Stitching:** Normalizes and stitches multiple 255-byte DNS text chunks into the unified RFC 4648 Base64 ciphertext string.

### 3.7 Minimalist Lock Screen & Live Diceware Counter
- Low-stress, distraction-free interface eliminating cryptographic jargon and developer noise.
- Live `X / 6+ words` counter badge that highlights cyan (`✓ X words (Valid)`) at 6–7 words and green (`✓ X words (Strong)`) at $\ge 8$ words to prevent whitespace and counting mistakes.
- Masked input with instant Show/Hide toggle.
- Streamlined button states (`Unlock Vault` and `Unlocking...`).

### 3.8 Emergency Paper Printout (`@media print` & Print Action)
- Dedicated print formatting tailored for high-stress scenarios where terminal access is constrained or unsecure.
- Strips all dark-mode styling down to high-contrast black text on white paper.
- Hides interactive buttons, DNS tools, inputs, badges, and footers.
- Formats password manager credentials, emergency notes, seed phrases, and backup codes into a clean 2-column card grid with `page-break-inside: avoid`.
- Displays a prominent confidential watermark header and strikes through burned codes with `[USED]` labels.
- Triggerable via a dedicated `🖨️ Print Sheet` button in the unlocked view or standard browser print shortcut (`Ctrl+P`).

---

## 4. Threat Model & Security Controls

### 4.1 Untrusted Terminal Mitigations
- **Content Security Policy (CSP):**
  ```http
  default-src 'none'; connect-src https://cloudflare-dns.com https://dns.google; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none';
  ```
  Outbound network access is strictly locked down: all external scripts, styles, objects, workers, frames, and arbitrary network destinations are completely blocked. `connect-src` is restricted exclusively to trusted public anycast DoH resolvers (`cloudflare-dns.com` and `dns.google`) solely for secondary dead-drop ciphertext retrieval. *Note: While XSS is strictly mitigated via `textContent` injection, the DoH `connect-src` whitelist theoretically creates a residual exfiltration vector where an attacker with code execution could exfiltrate secrets via recursive DNS queries.*
- **HTTP Response Security Headers (`public/_headers`):**
  - `X-Frame-Options: DENY`: Defends against iframe overlay and clickjacking attacks.
  - `Cache-Control: no-cache, no-store, must-revalidate`: Prevents public kiosk or retail terminals from writing decrypted content to disk cache.
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`: Enforces strict TLS.
  - `Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=(), usb=()`: Revokes all unnecessary browser device capabilities.
  - `X-Content-Type-Options: nosniff`: Prevents MIME-type sniffing.
- **DOM XSS Protection:** Decrypted strings are injected solely via `textContent` or text node creation—never via `innerHTML` or string interpolation.
- **No Disk Persistence:** Unencrypted payload data is never written to `localStorage` or IndexedDB. Only ephemeral used-code indices are stored in `sessionStorage` (scoped to `recovery_used_codes_<canaryCode>`).
- **Memory Purge Protocol:** The "Lock & Purge" procedure nullifies JavaScript heap references, wipes DOM nodes, and clears session storage. While JavaScript's non-deterministic garbage collection prevents guaranteed immediate zeroing of string primitives in the V8 heap, all accessible references are severed to protect against logical access.

### 4.2 Dead-Drop Storage & Edge Asset Isolation
- **Public vs. Private Repository:**
  - Plaintext credential files (`payload.json`) are barred by `.gitignore`.
  - The embedded Base64 ciphertext in `public/index.html` is cryptographically secure against offline brute-force attacks assuming $\ge 77$ bits entropy (PBKDF2 600k rounds + AES-GCM-256).
- **Physical Edge Isolation (Cloudflare Pages):**
  - Cloudflare deployment publishes strictly `./public` (`index.html` and `_headers`). Internal tools (`scripts/encrypt.js`, `scripts/deploy.sh`, test suites, specification docs) are physically separated and never uploaded to the public web root.

---

## 5. Offline Ingestion & Deployment Tooling

### 5.1 Encryption Utility (`scripts/encrypt.js`)
- **Environment:** Node.js 18+ standard library using `node:crypto` (`subtle` and `getRandomValues`). Zero third-party npm packages.
- **Command-Line Interface:**
  - `--sample [fresh|stale]`: Creates a schema-compliant `templates/sample-payload.json`.
  - `-i, --input <file>`: Reads plaintext JSON payload.
  - `-p, --passphrase <phrase>`: Accepts Diceware passphrase (masked interactive prompt with entropy validation if omitted).
  - `-o, --output <file>`: Writes Base64 ciphertext to file.
  - `-d, --domain <domain>`: Configures recovery DNS domain.
  - `--allow-low-entropy`: Explicitly bypasses Diceware entropy validation rules.
  - `--embed-html <file>`: Automatically injects the Base64 ciphertext into `const EMBEDDED_CIPHERTEXT = "..."` within `public/index.html`.
  - `--decrypt <base64>`: Decrypts and outputs formatted JSON to verify payload integrity offline.

### 5.2 Automated Deployment Script (`scripts/deploy.sh`)
Hardened Bash orchestration script for rotation and multi-provider production publishing:
1. **Pre-flight Checks:** Validates git repository, remote connectivity, and payload schema completeness.
2. **Passphrase Ingestion:** Prompts for Diceware passphrase with masked input, verifies $\ge 6$ Diceware words via `evaluatePassphraseEntropy` (recommending 8 words), and confirms input to prevent typos.
3. **Encryption & HTML Embedding:** Invokes `scripts/encrypt.js` to derive PBKDF2-600k keys and inject the Base64 ciphertext into `public/index.html` (or ephemeral staging directory).
4. **Pre-Deploy Verification:** Executes `tests/test-suite.js` to guarantee cryptographic and runtime validity before deployment.
5. **Deployment Execution:**
   - **Direct Edge Upload Mode (Zero Git Secrets):** Deploys directly to Cloudflare Pages, Netlify, or Vercel via CLI without modifying Git history.
   - **Git Push Mode:** Safely audits git staging area, stages strictly `public/index.html`, commits with UTC timestamp, and pushes to `origin main`.
6. **Plaintext Destruction:** Securely shreds and unlinks the plaintext payload file using `shred -u -z -n 3` (3-pass random overwrite + zero fill, defaulting to **Yes**).
7. **Automated DNS Sync:** Automatically synchronizes the secondary DNS TXT dead-drop via Cloudflare API v4 (`PUT`/`POST` to `/zones/:id/dns_records` with 120s TTL) if `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ZONE_ID` are set.

### 5.3 Automated Staleness Monitoring & Multi-Channel Webhooks (`scripts/check-staleness.js`, `.github/workflows/staleness-check.yml`)
- **Zero-Knowledge Principle:** Evaluates vault age without accessing private key material or decrypting ciphertext by reading the public `<meta name="vault-generated-at">` tag in `public/index.html`.
- **Scheduled CI Automation:** Runs on the 1st and 15th of every month via GitHub Actions (`cron: '0 9 1,15 * *'`).
- **Multi-Channel Push Alerting:** Supports `STALENESS_WEBHOOK_URL` (ntfy.sh, Discord, Slack, or generic HTTP endpoints) delivering high-priority push notifications directly to the operator's devices when the vault reaches `EXPIRING_SOON` or `STALE` status.
- **Issue Lifecycle Management:**
   - Automatically creates/updates an issue labeled `vault-staleness` when the vault is within 30 days of staleness or expired.
   - Automatically closes open staleness issues when a newly rotated vault is deployed (`status == FRESH`).

### 5.4 Offline Web Compiler (`tools/builder.html` & `scripts/build-builder.js`)
- **Runtime & Execution Model:** Standalone, single-file zero-dependency HTML application executable in any modern web browser via `file://` or local HTTP.
- **Security Boundary:** Bound by strict CSP (`default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none';`), mathematically barring network transmission.
- **Cryptographic Engine:** Executes browser-native WebCrypto (`window.crypto.subtle`) for PBKDF2-SHA-256 (600,000 rounds) key derivation and AES-GCM-256 authenticated encryption.
- **CSPRNG Diceware Engine:** Generates 8-word Diceware phrases (~80 bits entropy) using `window.crypto.getRandomValues` and an embedded 1,000-word dictionary with real-time entropy evaluation.
- **Pre-Flight In-Memory Round-Trip Verification:** Automatically attempts decryption against the in-memory payload and validates the canary code prior to compiling the final output.
- **Template Embedding & Override:** Ships with `public/index.html` embedded as Base64, with interactive drag-and-drop file input allowing custom template ingestion.
- **Deployment & Dead-Drop Assistance:** Generates a downloadable `index.html` alongside pre-formatted manual deployment guides for Cloudflare Pages (Git & Direct Upload) and DNS TXT dead-drop tables with 1-click clipboard helpers.

### 5.5 Modular Hosting Provider Framework (`scripts/providers/`, `scripts/deploy-site.sh`)
- **Pluggable Architecture:** Standard `BaseProvider` interface with shared `SECURITY_HEADERS` single source of truth across Cloudflare Pages, Netlify, Vercel, and GitHub Pages.
- **Dynamic Config Generation:** Automatically emits provider-specific edge security headers (`_headers`, `netlify.toml`, `vercel.json`), redirects (`_redirects`), and deployment directives.
- **Multi-Provider Web Deployment:** Orchestrated via `scripts/deploy-site.sh` (`--provider <cloudflare|netlify|vercel>`), supporting automated CI/CD (`.github/workflows/deploy-site.yml`) and local CLI execution.

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
9. Configurable recovery DNS domain meta tag and `RECOVERY_DNS_DOMAIN` variable verification.
10. Diceware passphrase entropy validation enforcing $\ge 6$ words, length, repetition rejection, and `--allow-low-entropy` override.
11. Whitespace and Unicode NFKC normalization parity across formatting variations.
12. Untrusted terminal clipboard auto-scrubbing code integrity, focus-catchup event listener, and "Lock & Purge" integration in `public/index.html`.
13. Automated Cloudflare DNS API dead-drop synchronization configuration and deployment logic integrity.
14. Emergency paper printout styles (`@media print`), confidential header, and print action button verification.
15. Multi-channel staleness push notification webhook payload generation and CI workflow integration.
16. In-browser TOTP HMAC-SHA1 mathematical validation.
17. Offline Vault Builder (`tools/builder.html`) security, CSP, and parity check.
18. Multi-provider edge security parity verifying identical strict CSP, HSTS, and `Cache-Control: no-store` headers across Cloudflare (`_headers`), Vercel (`vercel.json`), and Netlify (`netlify.toml`), along with modular provider registry verification.
19. Modular Credential Card Architecture & Normalization Parity verifying password manager, backup codes, seed phrase, TOTP group, key-value, and notes cards.
20. Decoupled Domain Architecture & Core Protocol Integrity verifying strict origin separation, deletion of public web platform from core vault repo, edge security parity (`public/_headers`), standalone offline builder (`tools/builder.html`), and trust assets (`LICENSE`, `SECURITY.md`).
