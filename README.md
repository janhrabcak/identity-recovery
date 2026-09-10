# Cold-Start Identity Recovery Protocol

[![CI & Integrity Tests](https://github.com/janhrabcak/identity-recovery/actions/workflows/ci.yml/badge.svg)](https://github.com/janhrabcak/identity-recovery/actions/workflows/ci.yml)
[![Live Web Platform](https://img.shields.io/badge/Live%20Web%20Platform-idrecoverykit.com-f38020?style=flat-square&logo=cloudflare)](https://idrecoverykit.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Staleness Monitor](https://github.com/janhrabcak/identity-recovery/actions/workflows/staleness-check.yml/badge.svg)](https://github.com/janhrabcak/identity-recovery/actions/workflows/staleness-check.yml)
![Dependencies](https://img.shields.io/badge/dependencies-0-success?style=flat-square&logo=npm)
![Node Support](https://img.shields.io/badge/node-%3E%3D18-informational?style=flat-square&logo=node.js)
![Cryptography](https://img.shields.io/badge/cipher-AES--GCM--256-blue?style=flat-square)
![KDF](https://img.shields.io/badge/KDF-PBKDF2--SHA--256%20(600k%20rounds)-blueviolet?style=flat-square)

Stateless, zero-hardware emergency credential recovery protocol designed to restore primary identity and root-of-trust access from an untrusted terminal or newly procured device anywhere in the world.

> **🌐 Official Web Platform:** [**idrecoverykit.com**](https://idrecoverykit.com/) &bull; [**Open Web Builder**](https://idrecoverykit.com/app/) &bull; *(Fallback Demo: [GitHub Pages](https://janhrabcak.github.io/identity-recovery/))*

### ⚡ 1-Click Edge Deployment
Deploy your private, encrypted recovery terminal to your preferred serverless edge network in seconds:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/janhrabcak/identity-recovery)
&nbsp;
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository_url=https://github.com/janhrabcak/identity-recovery)
&nbsp;
[![Deploy to Cloudflare Pages](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/janhrabcak/identity-recovery)

<p align="center">
  <img src="https://idrecoverykit.com/demo.gif" alt="Identity Recovery Protocol Web Builder Demo" width="800">
</p>

### 🛡️ Repository Health & Cryptographic Posture

| Dimension | Indicator | Operational Guarantee |
|---|---|---|
| **Cryptographic Parity** | `🟢 20/20 Passed` | Node.js WebCrypto $\leftrightarrow$ Browser WebCrypto end-to-end verified |
| **Supply Chain Risk** | `🟢 0 Dependencies` | Pure Node.js standard libraries & browser-native APIs (zero npm attack surface) |
| **Edge Header Security** | `🟢 Hardened` | Strict CSP (`default-src 'none'`), `no-store` cache control, anti-clickjacking (`DENY`) |
| **Vault Freshness** | `🟢 Automated` | Bi-monthly GitHub Actions audit + multi-channel push alerts (ntfy/Discord/Slack) |
| **Disaster Fallback** | `🟢 Redundant` | Secondary RFC 1035 DNS TXT dead-drop via Anycast DoH (Cloudflare + Google failover) |
| **Memory Sanitation** | `🟢 Active Purge` | Ephemeral DOM lifecycle, "Lock & Purge", panic keybind (`Esc` $\times 3$), auto-scrubbing |

---

## 🎯 Protocol Overview

- **Disaster Scenario:** Total physical hardware loss (lost phone, lost YubiKey, lost wallet, no trusted devices).
- **Modular Credential Cards:** Flexible, composable secret blocks for:
  - 🔑 **Password Managers:** 1Password, Bitwarden, KeePassXC, Dashlane, Proton Pass, or custom vaults.
  - 🛡️ **2SV Backup Codes:** Google, GitHub, Apple Recovery Keys, Microsoft, AWS, or any service (with per-card interactive burned code tracking).
  - 🌱 **Seed Phrases:** BIP-39 12/18/24-word recovery phrases for Ledger, Trezor, MetaMask, Phantom, etc., with click-to-reveal word chips.
  - ⏱️ **Live In-Browser TOTP:** Real-time 30-second rotating two-factor codes for unlimited services.
  - 🔐 **Custom Secrets & Keys:** Arbitrary key-value fields for SSH keys, LUKS disk passphrases, PGP fingerprints, and PINs.
  - 📝 **Emergency Instructions:** Rich text emergency contacts, trusted numbers, and protocol guidelines.
- **Key Material:** Memorized 6-word Diceware passphrase (~77 bits entropy).
- **Cryptography:** AES-GCM-256 with PBKDF2-SHA-256 (600,000 iterations, 16-byte random salt, 12-byte random IV).
- **Runtime:** Single-file zero-dependency `public/index.html` executing native WebCrypto (`window.crypto.subtle`).
- **Primary Dead-Drop:** Edge Anycast CDN (`https://sos.<yourdomain>.com` on Cloudflare Pages, Netlify, or Vercel).
- **Secondary Dead-Drop:** RFC 1035 DNS TXT record (`recovery.<yourdomain>.com`) queryable via DNS-over-HTTPS (DoH).

---

## 🏗️ Architecture Flow

```text
[Trusted Local Machine]
   Credentials + 6-word Passphrase
         |
         +---> Option A: tools/builder.html (Offline WebCrypto GUI)
         |        |
         |        +---> Generates & downloads hardened index.html
         |        +---> Deploys to Cloudflare Pages (Direct Upload or Git)
         |        +---> Copies Base64 ciphertext for DNS TXT dead-drop
         |
         +---> Option B: ./scripts/deploy.sh (Automated CLI Pipeline)
                  |
                  +---> public/index.html (Pushed to Cloudflare Edge)
                  +---> DNS TXT Dead-Drop (Synced via Cloudflare API)
                  +---> Shreds plaintext payload.json (3 passes + zero-fill)

[Untrusted Kiosk / Disaster Device]
   1. Visit https://sos.<yourdomain>.com (or query DNS TXT)
   2. Enter memorized 6-word passphrase
   3. In-browser WebCrypto decrypts payload client-side
   4. Copy single-use 2SV backup code or view live TOTP
   5. Sign in to primary identity (e.g. Google / Apple) -> Access password manager -> Recover all accounts
   6. Click "Lock & Purge" (or press Escape x3) to wipe all memory
```

---

## ⚡ 60-Second Quick Start (Deploying Your Vault)

A complete recovery setup consists of **two defensive pillars**:
1. **🌐 Pillar 1: The Web Recovery Terminal** — Hardened client-side decryption app hosted on Cloudflare Pages, Netlify, or Vercel.
2. **📡 Pillar 2: The DNS TXT Dead-Drop** — An independent emergency fallback record queryable via DNS-over-HTTPS (DoH) if your web host is unreachable or censored.

Choose the path that fits your workflow:

---

### Option A: In-Browser Web App (Zero Installs, Zero Git Clone)
*Recommended for most users. No terminal, Git, or Node.js required.*

1. **Build Your Vault & Ciphertext:**
   Open **[idrecoverykit.com/app](https://idrecoverykit.com/app)** (or download [`tools/builder.html`](tools/builder.html) for offline air-gapped use).
   - Enter your credentials (1Password Secret Key, Google backup codes, TOTP seeds).
   - Generate or enter your memorized 6-word Diceware passphrase.
   - Enter your target recovery domain (e.g. `sos.yourdomain.com`).
   - Click **Encrypt & Build Recovery Terminal**.

2. **Deploy the Web Terminal (Pillar 1):**
   Click **⬇️ Download index.html** and deploy it in 10 seconds:
   - **Cloudflare Pages:** Dashboard &rarr; **Workers & Pages** &rarr; **Create application** &rarr; **Pages** &rarr; **Direct Upload** (drag-and-drop the folder containing `index.html`).
   - **Netlify:** Dashboard &rarr; **Sites** &rarr; **Netlify Drop** (drag-and-drop the folder).
   *Your recovery terminal is now live at `https://sos.yourdomain.com`.*

3. **Publish the DNS TXT Dead-Drop (Pillar 2):**
   The builder screen displays your generated **Base64 Ciphertext**. In your DNS provider (Cloudflare DNS, AWS Route 53, Namecheap, etc.), add a `TXT` record:
   - **Record Type:** `TXT`
   - **Name / Host:** `sos` (or full subdomain `sos.yourdomain.com`)
   - **Content / Value:** `<paste your Base64 ciphertext>`
   - **TTL:** `120` seconds (or Auto)

> [!TIP]
> **Why the DNS dead-drop matters:**
> - **Hosting Outage Fallback:** If your personal website (`sos.yourdomain.com`) is ever offline, expired, or blocked, you don't lose access! You can open the public universal player at **[idrecoverykit.com](https://idrecoverykit.com)** (or open a generic `index.html` from a USB drive), type `sos.yourdomain.com`, and click **⚡ Fetch from DNS**. The browser pulls your encrypted ciphertext directly from your DNS TXT record via Cloudflare & Google DoH.
> - **Instant Rotation:** You can rotate your encrypted vault anytime simply by updating your DNS TXT record—no web rebuild or redeployment needed.

---

### Option B: 1-Command Automated CLI (Automates Web + DNS Sync)
*Recommended for terminal users and automated rotation.*

Run the interactive setup wizard directly with **zero repository cloning**:
```bash
npx github:janhrabcak/identity-recovery
```
*(Or if you prefer a private Git repository, click the green **[Use this template]** button on GitHub and run `./scripts/deploy.sh payload.json`)*

**What the CLI automates in one shot:**
1. Derives encryption keys using PBKDF2-SHA256 (600,000 iterations) + AES-GCM-256.
2. Direct-uploads to Cloudflare Pages, Netlify, or Vercel with zero Git secrets.
3. **Automatically publishes or updates your Cloudflare DNS TXT dead-drop** via API (or prints the exact DNS table for other providers).
4. Executes all 20 automated cryptographic and edge security tests.
5. Securely shreds plaintext credentials from disk.

---

## 📚 Detailed Documentation

| Guide | Description |
|---|---|
| [**`docs/DEPLOYMENT.md`**](docs/DEPLOYMENT.md) | Multi-provider deployment (Cloudflare Pages, Netlify, Vercel, Caddy, Nginx) and DNS TXT dead-drop configuration. |
| [**`docs/CLI_REFERENCE.md`**](docs/CLI_REFERENCE.md) | Command-line reference for `deploy.sh`, `encrypt.js`, `check-staleness.js`, and test suites. |
| [**`docs/FEATURES.md`**](docs/FEATURES.md) | In-depth breakdown of live TOTP generation, offline QR codes, panic keybind, clipboard auto-scrubbing, and print sheets. |
| [**`SPEC.md`**](SPEC.md) | Complete cryptographic and architectural specification, schema definitions, and threat model. |

---

## 📁 Project Structure

```text
identity-recovery/
├── public/                       # 🌐 Private recovery terminal edge deployment (Cloudflare Pages / Netlify / Vercel)
│   ├── index.html                # Recovery terminal UI (contains encrypted ciphertext)
│   └── _headers                  # Strict HTTP security headers (CSP, HSTS, no-store)
│
├── tools/                        # 🖥️ Offline client-side browser tools
│   └── builder.html              # Standalone web builder to generate index.html offline
│
├── scripts/                      # 🛠️ Private offline tooling (trusted machine only)
│   ├── build-builder.js          # Generator script to refresh tools/builder.html
│   ├── deploy.sh                 # 7-step rotation, verification, and publish pipeline (Direct Upload or Git)
│   ├── encrypt.js                # WebCrypto AES-GCM / PBKDF2 offline CLI
│   ├── check-staleness.js        # Zero-knowledge staleness evaluator for CI/alerts
│   └── providers/                # 🔌 Pluggable hosting provider framework (Cloudflare, Netlify, Vercel, etc.)
│
├── .github/workflows/            # ⏰ CI & scheduled monitoring
│   ├── ci.yml                    # Automated tests across Node 18, 20, 22
│   └── staleness-check.yml       # Bi-monthly automated staleness alert workflow
│
├── docs/                         # 📖 In-depth guides
│   ├── DEPLOYMENT.md             # Cloudflare Pages, Netlify, Vercel, & DNS setup
│   ├── CLI_REFERENCE.md          # Manual CLI flags & offline workflow
│   └── FEATURES.md               # UI features (TOTP, QR, panic keybind)
│
├── templates/                    # 📋 Dummy schemas
│   └── sample-payload.json       # Template schema with TOTP seeds
│
├── tests/                        # 🧪 Verification suite
│   └── test-suite.js             # 20 automated cryptographic & integrity tests
│
├── wrangler.toml                 # Cloudflare Pages configuration
├── vercel.json                   # Vercel edge security header configuration
├── netlify.toml                  # Netlify edge security header configuration
├── .env.example                  # Environment template (RECOVERY_DOMAIN)
├── .gitignore                    # Security boundary (blocks unencrypted payload.json)
├── README.md                     # Landing page & quick run guide
└── SPEC.md                       # Full cryptographic specification
```

---

## 🔒 Security Cardinal Rule

> [!CAUTION]
> **Never commit unencrypted credentials (`payload.json`) to Git.**
> The `.gitignore` is strictly configured to bar `payload.json`, `*secret*`, and private environment files. The only file that touches Git is `public/index.html` containing the AES-GCM-256 encrypted ciphertext, which is cryptographically safe for public hosting assuming $\ge 77$ bits entropy.
