# Cold-Start Identity Recovery Protocol

[![CI & Integrity Tests](https://github.com/janhrabcak/identity-recovery/actions/workflows/ci.yml/badge.svg)](https://github.com/janhrabcak/identity-recovery/actions/workflows/ci.yml)
[![Live Web Platform](https://img.shields.io/badge/Live%20Platform-idrecoverykit.com-f38020?style=flat-square&logo=cloudflare)](https://idrecoverykit.com/)
[![Dependencies](https://img.shields.io/badge/dependencies-0-success?style=flat-square&logo=npm)](SPEC.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Staleness Monitor](https://github.com/janhrabcak/identity-recovery/actions/workflows/staleness-check.yml/badge.svg)](https://github.com/janhrabcak/identity-recovery/actions/workflows/staleness-check.yml)

Stateless, zero-hardware emergency credential recovery protocol. Restore master passwords, 2FA backup codes, BIP-39 seed phrases, and live TOTP seeds from any borrowed browser without your phone, laptop, or hardware security keys.

> 🌐 **Official Web Platform & In-Browser Builder:** [**idrecoverykit.com**](https://idrecoverykit.com/) &bull; [**Open Web Builder**](https://idrecoverykit.com/app/)

### ⚡ 1-Click Edge Deployment
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/janhrabcak/identity-recovery)
&nbsp;
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository_url=https://github.com/janhrabcak/identity-recovery)
&nbsp;
[![Deploy to Cloudflare Pages](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/janhrabcak/identity-recovery)

<p align="center">
  <img src="https://idrecoverykit.com/demo.gif" alt="Identity Recovery Protocol Web Builder Demo" width="800">
</p>

---

## 🎯 The Cold-Start Problem

When physical disaster strikes (stolen phone, laptop, and YubiKey), you enter a catch-22:
- **1Password / Bitwarden** require a **34-character Secret Key or Master Password** (stored on your stolen laptop).
- **Google / Apple / GitHub** require a **hardware key or 2SV prompt** (sent to your stolen phone).

**The Solution:** An offline AES-GCM-256 encrypted single-file recovery terminal unlocked on **any untrusted browser** using a single memorized 6-word Diceware passphrase (~77 bits entropy). Supports modular cards for **Password Managers**, **2SV Backup Codes**, **BIP-39 Seed Phrases**, **Live TOTP**, and **SSH/LUKS keys**.

### Two Defensive Pillars
1. **🌐 Pillar 1: Web Recovery Terminal** — Hardened client-side decryption app hosted on Cloudflare Pages, Netlify, or Vercel.
2. **📡 Pillar 2: DNS TXT Dead-Drop** — An independent emergency fallback record queryable via DNS-over-HTTPS (DoH) if your web host is unreachable or blocked.

---

## ⚡ 60-Second Quick Start

### Option A: In-Browser Web App (Zero Installs, Zero Git Clone)
*Recommended for most users. No terminal, Git, or Node.js required.*

1. **Build Your Vault & Ciphertext:**
   Open **[idrecoverykit.com/app](https://idrecoverykit.com/app)** (or save [`tools/builder.html`](tools/builder.html) for offline air-gapped use).
   - Enter your credentials, set your 6-word Diceware passphrase, and specify your recovery domain (e.g. `sos.yourdomain.com`).
   - Click **Encrypt & Build Recovery Terminal**.

2. **Deploy the Web Terminal (Pillar 1):**
   Click **⬇️ Download index.html** &rarr; drag-and-drop into **Cloudflare Pages** (Direct Upload) or **Netlify Drop**. Your terminal is live at `https://sos.yourdomain.com`.

3. **Publish the DNS TXT Dead-Drop (Pillar 2):**
   Copy the generated **Base64 Ciphertext** from the screen and add a `TXT` record at your domain (e.g. `sos.yourdomain.com`) in Cloudflare DNS, AWS Route 53, or Namecheap:
   - **Record Type:** `TXT`
   - **Name / Host:** `sos` (or full subdomain `sos.yourdomain.com`)
   - **Content / Value:** `<paste your Base64 ciphertext>`
   - **TTL:** `120` seconds (or Auto)

> [!TIP]
> **Why the DNS dead-drop matters:**
> - **Hosting Outage Fallback:** If your personal website (`sos.yourdomain.com`) is ever offline or blocked, you don't lose access! You can open the public universal player at **[idrecoverykit.com](https://idrecoverykit.com)** (or open a generic `index.html` from a USB drive), type `sos.yourdomain.com`, and click **⚡ Fetch from DNS**. The browser pulls your encrypted ciphertext directly from your DNS TXT record via Cloudflare & Google DoH.
> - **Instant Rotation:** You can rotate your encrypted vault anytime simply by updating your DNS TXT record—no web rebuild or redeployment needed.

---

### Option B: 1-Command Automated CLI
*Recommended for terminal users and automated rotation.*

Run the interactive setup wizard directly with **zero repository cloning**:
```bash
npx github:janhrabcak/identity-recovery
```
*(Or click **[Use this template]** on GitHub and run `./scripts/deploy.sh payload.json`)*

**What the CLI automates in one shot:**
1. Derives encryption keys using PBKDF2-SHA256 (600,000 iterations) + AES-GCM-256.
2. Direct-uploads to Cloudflare Pages, Netlify, or Vercel with zero Git secrets.
3. **Automatically publishes or updates your Cloudflare DNS TXT dead-drop** via API (or prints the exact DNS table for other providers).
4. Executes all 20 automated cryptographic and edge security tests.
5. Securely shreds plaintext credentials from disk.

---

## 🛡️ Core Guarantees

- **600,000 PBKDF2 Iterations:** Exceeds OWASP recommendations by 300k rounds; 96-bit CSPRNG IVs.
- **100% Zero Dependencies:** Native WebCrypto (`window.crypto.subtle`) and standard Node libraries. Zero npm attack surface.
- **Edge Security Parity:** Strict CSP (`default-src 'none'`), `no-store` cache control, and anti-clickjacking (`DENY`) across all providers.
- **Active Memory Sanitation:** Ephemeral DOM lifecycle, panic keybind (`Escape x3`), and 45s clipboard auto-scrub.
- **Automated Freshness Audits:** Bi-monthly staleness monitor with Discord, Slack, and ntfy push notifications.

---

## 📚 Detailed Documentation

| Guide | Description |
|---|---|
| [**`SPEC.md`**](SPEC.md) | Cryptographic specification, data schemas, and threat model. |
| [**`docs/DEPLOYMENT.md`**](docs/DEPLOYMENT.md) | Multi-provider deployment (Cloudflare Pages, Netlify, Vercel, Caddy, Nginx) and DNS TXT dead-drop configuration. |
| [**`docs/CLI_REFERENCE.md`**](docs/CLI_REFERENCE.md) | Command-line reference for `deploy.sh`, `encrypt.js`, `check-staleness.js`, and test suites. |
| [**`docs/FEATURES.md`**](docs/FEATURES.md) | Live TOTP generation, offline QR codes, panic purge, and emergency paper printout. |

---

## 🔒 Security Cardinal Rule

> [!CAUTION]
> **Never commit unencrypted credentials (`payload.json`) to Git.**
> The `.gitignore` strictly bars unencrypted payloads. Only `public/index.html` containing AES-GCM-256 ciphertext touches Git or edge hosts.
