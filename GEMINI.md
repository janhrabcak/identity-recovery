# Cold-Start Identity Recovery Protocol — Agent Technical Context & Invariants

## Architecture & Codebase Overview
- **Zero-Dependency Mandate:** Neither the recovery terminal (`public/index.html`) nor the offline compiler (`tools/builder.html`) may import external scripts, CDNs, or styles. Everything runs strictly in browser-native WebCrypto (`window.crypto.subtle`) and standard Node (`node:fs`, `node:path`, `node:url`).
- **Cryptographic Specifications:**
  - PBKDF2-HMAC-SHA256 with 600,000 iterations (exceeds OWASP minimum).
  - 16-byte random salt, 12-byte random IV.
  - AES-GCM-256 with 128-bit authentication tag.
  - Combined binary wire format: `[salt (16B)][iv (12B)][ciphertext + tag]`, encoded as standard Base64.
- **Diceware Passphrase Tiering (Solution 3 Model):**
  - Validation Floor: Minimum $\ge 6$ whitespace-delimited words, $\ge 20$ chars, $\ge 4$ unique words (accepts external 7,776-word EFF passphrases at ~77.5 bits).
  - Built-in Dictionary: Contains 1,000 words ($\approx 9.97$ bits/word).
  - Default Generator: Both CLI (`scripts/cli.js`) and Web Studio (`tools/builder.html`) generate **8 words** (`Uint32Array(8)`), guaranteeing $\approx 79.7$ bits (~80 bits) entropy.
  - UI State Indicators: `< 6 words` (Incomplete/gray), `6–7 words` (Valid/cyan), `≥ 8 words` (Strong/green).
- **Strict Content-Security-Policy:**
  - Terminal: `default-src 'none'; connect-src https://cloudflare-dns.com https://dns.google; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none';`
  - Builder / Studio: `default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none';`

---

## Studio Workspace (`scripts/build-builder.js` -> `tools/builder.html`)
- **Generator Architecture:** `scripts/build-builder.js` reads `public/index.html`, converts it to Base64 (`DEFAULT_INDEX_TEMPLATE_B64`), and injects it into `BUILDER_HTML`. Running `npm run build` writes `tools/builder.html`.
- **Layout Model (Option 2 Split-Pane):**
  - Left rail (`320px`): Persistent Diceware key status, quick-add palette (`#btn-add-pm`, `#btn-add-codes`, etc.), scrollable vault card deck, and sticky build CTA (`#btn-build-vault`).
  - Center/Right Canvas: Dedicated panels for Passphrase (`#panel-passphrase`), Settings (`#panel-settings`), and Card Editor (`#panel-card-editor`).
  - Live Terminal Preview: When editing a credential card, `#live-preview-content` renders the decrypted terminal appearance in real-time, responding synchronously to `input` events.
- **Negative Decisions:**
  - *Why not a multi-page framework or SPA bundler?* Introducing React, Vue, or Webpack adds build dependencies and supply chain attack surface. Raw HTML/CSS/vanilla JS guarantees zero-supply-chain risk.
  - *Why not a single continuous form?* The original monolithic form stacked dozens of inputs simultaneously, resulting in excessive scrolling and cognitive overload during credential entry.

---

## Automated Verification & Test Invariants
- `tests/test-suite.js` executes 20 automated tests:
  - **Test 17:** Enforces zero external scripts/styles, strict CSP `default-src 'none'`, 600,000 PBKDF2 iterations, AES-GCM references, and embedded template presence in `tools/builder.html`.
  - **Test 18:** Verifies edge security headers (`no-store`, `DENY`, strict CSP) across `vercel.json` and `netlify.toml`, and checks provider CLI generators.
  - **Test 19:** Verifies modular card payload round-trip encryption/decryption parity across all 6 item types (`password_manager`, `backup_codes`, `seed_phrase`, `totp_group`, `key_value`, `notes`).
  - **Test 20:** Enforces decoupled domain architecture and standalone builder compilation.

---

## Mirroring & Synchronization Rule
- Any changes to `tools/builder.html` must be synchronized to the public platform repository at `/home/jh/projects/idrecoverykit-site/app/index.html`.
- Run `npm test` in both repositories after any modification to ensure zero regressions.
