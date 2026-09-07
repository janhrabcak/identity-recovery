# Project Specification: Cold-Start Identity Recovery Protocol

## 1. System Overview & Constraints
- **Root of Trust:** 1Password (holds all credentials, Google backup codes, and downstream accounts).
- **Primary Identity:** Google (@gmail.com, standard consumer account with 2SV enabled).
- **Disaster Scenario:** Total hardware and physical loss ("lost everything", no phone, no YubiKey, no wallet).
- **Recovery Requirement:** Global, location-independent recovery from an untrusted terminal or newly procured retail device.

## 2. Recovery Architecture

### Tier 1: Stateless Encrypted Dead-Drop (Zero Hardware)
- **Hosting Target:** GitHub Pages served over HTTPS via custom domain (`sos.<domain>.com`).
- **Runtime Model:** Standalone, zero-dependency `index.html` using browser-native WebCrypto (`window.crypto.subtle`). No external CDNs, frameworks, or runtime network calls.
- **Cryptography:**
  - Cipher: AES-GCM-256.
  - Key Derivation: PBKDF2 with SHA-256 (600,000 iterations) and 16-byte random salt.
  - Key Material: Memorized 6-word Diceware passphrase (~77 bits entropy), distinct from the 1Password master password.
- **Offline Ingestion (`encrypt.js`):**
  - Node.js 18+ script executed locally on a trusted machine.
  - Outputs a base64 string containing: `[16-byte salt][12-byte IV][ciphertext]`.
- **Payload Schema:**
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
    "googleBackupCodes": ["23456789", "34567890", "..."],
    "notes": "Emergency numbers and instructions"
  }
