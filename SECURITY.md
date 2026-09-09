# Security Policy

## Reporting a Vulnerability

We take the security of the Cold-Start Identity Recovery Protocol seriously. If you discover a security vulnerability or cryptographic weakness, please report it responsibly.

**Please DO NOT file a public issue.**

Instead, please report vulnerabilities by:
- Using [GitHub Private Vulnerability Reporting](https://github.com/janhrabcak/identity-recovery/security/advisories/new) on this repository, OR
- Emailing **jan@hrabcak.com** with the subject line `[SECURITY] Identity Recovery Vulnerability`.

Please include:
- A description of the vulnerability.
- Steps to reproduce or proof-of-concept payload.
- Potential impact on confidentiality, integrity, or client memory.

We will acknowledge receipt within 48 hours and coordinate remediation before public disclosure.

---

## Scope & Cryptographic Architecture

| Layer | Standard / Implementation |
|---|---|
| **Cipher** | AES-GCM-256 (NIST SP 800-38D, 12-byte IV, 16-byte authentication tag) |
| **KDF** | PBKDF2 with HMAC-SHA-256, 600,000 iterations (OWASP password storage guidelines) |
| **Passphrase** | 6-word Diceware (~77 bits of entropy) with NFKC normalization |
| **Network Boundaries** | Strict Content Security Policy (`default-src 'none'`), zero external dependencies |
| **Memory Sanitation** | Ephemeral DOM lifecycle, 45s clipboard auto-scrubbing, panic lock keybind (`Esc` x 3) |

---

## In-Scope vs. Out-of-Scope

### In-Scope
- Implementation bugs in cryptographic derivation, encryption, or decryption routines.
- Cross-Site Scripting (XSS) or DOM injection flaws in recovery terminals or web builder.
- Bypasses of the Content Security Policy (CSP) or HTTP security headers.
- Information leaks via clipboard, browser caching, or local storage.
- DoH parser flaws or SSRF/injection in synchronization scripts.

### Out-of-Scope
- Weak user passphrases that explicitly bypassed entropy warnings (`--allow-low-entropy`).
- Physical keyloggers or kernel-level malware on the recovery terminal hardware itself.
- Attacks requiring full root or debugger access to the browser process while the vault is unlocked in memory.
- Social engineering or physical coercion of the vault owner.
