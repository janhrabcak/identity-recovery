# Project Specification: Cold-Start Identity Recovery Protocol

## 1. System Overview & Constraints
- **Root of Trust:** 1Password (holds all credentials, Google backup codes, and downstream accounts).
- **Primary Identity:** Google (@gmail.com, standard consumer account with 2SV enabled).
- **Disaster Scenario:** Total hardware and physical loss ("lost everything", no phone, no YubiKey, no wallet).
- **Recovery Requirement:** Global, location-independent recovery from an untrusted terminal or newly procured retail device.

---

## 2. Recovery Architecture: Tier 1 Stateless Encrypted Dead-Drop

### 2.1 Hosting Target & Runtime Model
- **Hosting Target:** Cloudflare Pages (recommended) or GitHub Pages served over HTTPS via custom domain (`sos.<domain>.com`).
- **Runtime Model:** Standalone, single-file zero-dependency `index.html` executing pure browser-native WebCrypto (`window.crypto.subtle`). No external CDNs, JavaScript frameworks, remote fonts, or runtime network calls.

### 2.2 Cryptographic Specification
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

### 2.3 Payload Schema
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

## 3. Client-Side Runtime & Recovery Interface (`index.html`)

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
  4. Clears the passphrase input value.
  5. Cleans up `sessionStorage`.
  6. Returns the UI to the locked screen state.

---

## 4. Threat Model & Security Controls

### 4.1 Untrusted Terminal Mitigations
- **Content Security Policy (CSP):**
  ```http
  default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none';
  ```
  Completely forbids outbound network calls (`fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, beacons, or DNS prefetch). Even on a compromised or malicious network, the page cannot exfiltrate decrypted secrets.
- **HTTP Response Security Headers (`_headers`):**
  - `X-Frame-Options: DENY`: Defends against iframe overlay and clickjacking attacks.
  - `Cache-Control: no-cache, no-store, must-revalidate`: Prevents public kiosk or retail terminals from writing decrypted content to disk cache.
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`: Enforces strict TLS.
  - `Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=(), usb=()`: Revokes all unnecessary browser device capabilities.
  - `X-Content-Type-Options: nosniff`: Prevents MIME-type sniffing.
- **DOM XSS Protection:** Decrypted strings are injected solely via `textContent` or text node creation—never via `innerHTML` or string interpolation.
- **No Disk Persistence:** Unencrypted payload data is never written to `localStorage` or IndexedDB. Only ephemeral used-code indices are stored in `sessionStorage` (scoped to `recovery_used_codes_<canaryCode>`).
- **Memory Purge Protocol:** The "Lock & Purge" procedure nullifies JavaScript heap references, wipes DOM nodes, and clears session storage.

### 4.2 Dead-Drop Storage & Asset Isolation
- **Public vs. Private Repository:**
  - Plaintext credential files (`payload.json`) are barred by `.gitignore`.
  - The embedded Base64 ciphertext in `index.html` is cryptographically secure against offline brute-force attacks assuming $\ge 77$ bits entropy (PBKDF2 600k rounds + AES-GCM-256).
- **Edge Asset Isolation (`.assetsignore`):**
  - Cloudflare deployment publishes strictly `index.html` and `_headers`. Internal tools (`encrypt.js`, test suites, specification docs) are excluded from the public edge web root.

---

## 5. Offline Ingestion Tooling (`encrypt.js`)

- **Environment:** Node.js 18+ standard library using `node:crypto` (`subtle` and `getRandomValues`). Zero third-party npm packages.
- **Command-Line Interface:**
  - `--sample [fresh|stale]`: Creates a schema-compliant `sample-payload.json`.
  - `-i, --input <file>`: Reads plaintext JSON payload.
  - `-p, --passphrase <phrase>`: Accepts Diceware passphrase (masked interactive prompt if omitted).
  - `-o, --output <file>`: Writes Base64 ciphertext to file.
  - `--embed-html <file>`: Automatically injects the Base64 ciphertext into `const EMBEDDED_CIPHERTEXT = "..."` within `index.html`.
  - `--decrypt <base64>`: Decrypts and outputs formatted JSON to verify payload integrity offline.

---

## 6. Verification Suite (`test-suite.js`)

Automated test runner verifying:
1. End-to-end cryptographic parity between Node WebCrypto and browser WebCrypto.
2. Rejection of invalid passphrases via AES-GCM authentication tag failure.
3. Rejection of corrupted or tampered ciphertext bytes.
4. Staleness classification logic (`FRESH`, `EXPIRING_SOON`, `STALE`).
5. Zero-dependency integrity check verifying no external scripts, CDNs, or styles exist in `index.html`.
6. Automated HTML embedding regex verification.
