# 🛡️ Vault Client Features & Security Controls

`public/index.html` is a standalone, single-file recovery terminal designed for disaster scenarios where you must access credentials from an untrusted public computer (hotel business center, kiosk, or borrowed device).

---

## 1. Minimalist Lock Screen & Live Diceware Counter
- Clean, distraction-free UI eliminating cryptographic noise.
- **Live Diceware Counter:** Real-time `X / 6 words` badge turns green (`✓ 6 / 6 words`) upon entering all 6 words.
- Masked password input with instant Show/Hide toggle.
- Automatically handles Unicode NFKC normalization and whitespace collapsing.

---

## 2. ⏱️ In-Browser Live TOTP Generator
- Storing base32 TOTP seeds in your payload (e.g. `"totpSeeds": { "Google": "JBSWY3..." }`) enables live authenticator code generation directly inside the recovery terminal.
- **Zero Dependencies:** Pure WebCrypto HMAC-SHA1 calculation updating every 30 seconds.
- **Progress Bar:** Real-time visual countdown timer showing remaining seconds before rotation.
- Eliminates dependency on a finite pool of single-use backup codes.

---

## 3. 🚨 Panic Keybind (`Escape` × 3)
- If someone approaches you while viewing secrets on an untrusted public terminal, press `Escape` **3 times in rapid succession** (<1500ms).
- **Instant Response:** Full-screen red flash confirmation, immediate memory nullification, DOM wipe, session storage reset, and OS clipboard scrub.

---

## 4. 📱 Offline QR Code Generator
- Generates high-contrast QR codes directly on an HTML5 `<canvas>` using an inlined, heavily audited Nayuki QR library.
- Click **"📱 QR"** next to your 1Password Secret Key or notes to scan credentials onto a newly procured phone camera without typing 34 characters manually.
- 100% offline—no third-party image generation APIs or CDN requests.

---

## 5. 📥 Secure Plaintext Export (Blob Download)
- Once you reach a newly procured trusted machine, you can export the decrypted payload as a JSON file.
- Uses ephemeral `URL.createObjectURL(new Blob(...))` for local client-side file generation.
- Includes a warning prompt reminding you to securely shred the file after importing it into your password manager.

---

## 6. Single-Use Backup Code Strikethrough Tracker
- Google 2SV backup codes are single-use. The tracker helps prevent burning or re-trying used codes under stress.
- Clicking any code strikes it through (`text-decoration: line-through`) and marks it `[USED]`.
- **"⚡ Copy Next Unused Code":** One-click button copies the next unstruck code, scrolls it into view, and highlights it.
- **Session Persistence:** Preserved in `sessionStorage` (scoped to `recovery_used_codes_<canaryCode>`) so accidental browser refreshes do not lose your place.

---

## 7. Universal Clipboard Auto-Scrubbing
- Dedicated one-click copy buttons for all fields with visual confirmation (`✓ Copied! (clears in 45s)`).
- **45s Timed Wipe:** Schedules an automatic clipboard wipe (overwriting with blank space `" "`) after 45 seconds.
- **Focus Catch-Up:** If the 45s timer fires while you are in another tab (e.g., signing in to Google), the clipboard is immediately scrubbed as soon as you refocus the recovery tab.
- **Manual Clean:** Dedicated `🧹 Clear Clipboard` button to wipe credentials on demand.

---

## 8. High-Stress Emergency Paper Printout (`@media print`)
- Formats the decrypted vault into a high-contrast, ink-saving black-and-white 2-column layout.
- Strips out all interactive buttons, inputs, and dark backgrounds.
- Used codes retain their strikethrough and receive explicit `[USED]` stamps.
- Triggerable via the `🖨️ Print Sheet` button or standard `Ctrl+P`.

---

## 9. 🛠️ Standalone Offline Vault Compiler (`tools/builder.html`)
- **100% In-Browser WebCrypto:** Encrypts `payload.json` or interactive form fields using `window.crypto.subtle` with 600,000 PBKDF2 rounds and AES-GCM-256.
- **Strict Zero-Network CSP:** Configured with `default-src 'none'`, ensuring your credentials can never be leaked to any server.
- **Embedded Diceware Engine:** Generates high-entropy 6-word phrases using `crypto.getRandomValues` and a curated dictionary, with live entropy indicators (words, characters, unique count).
- **Intelligent Input Parsing:** Auto-cleans and counts pasted Google backup codes, handles dynamic TOTP account seeds, and imports/exports schema JSON files.
- **Pre-Flight In-Memory Verification:** Cryptographically tests decryption against the canary code in memory before allowing download.
- **Interactive Deployment & DNS Card:** Pre-computes and displays your Cloudflare DNS TXT record with 1-click copy buttons for Host, TTL, and Base64 ciphertext.
