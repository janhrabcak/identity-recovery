# 🌐 Deployment & Infrastructure Guide

This guide covers hosting your cold-start identity recovery vault on Cloudflare Pages, configuring custom domains, and maintaining the secondary DNS-over-HTTPS (DoH) dead-drop.

---

## 1. Hosting on Cloudflare Pages (Recommended)

Cloudflare Pages is the optimal hosting platform for this protocol because:
- Supports **private repositories for free**.
- Provides instant Anycast global CDN edge routing (<50ms globally).
- Automatically provisions and renews SSL/TLS certificates.
- Natively parses and applies HTTP response headers from [`public/_headers`](../public/_headers).

### Method A: Connect to Git (Automated CI/CD)

1. Push your repository to a **private** GitHub repository.
2. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to:
   **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
3. Authorize GitHub and select your repository (`identity-recovery`).
4. Configure the build settings:
   - **Framework preset:** `None`
   - **Build command:** *(leave empty)*
   - **Build output directory:** `public`
5. Click **Save and Deploy**. Your site will be live at `https://identity-recovery.pages.dev`.

> [!WARNING]
> **Build Output Directory:** You must set the output directory strictly to `public`. Setting it to `.` will expose your private `scripts/` and `tools/` directories and bypass the `_headers` Content Security Policy rules!

### Method B: Automated Direct Upload via Wrangler (Zero Git Secrets — Recommended)

If you keep this repository **public** as an open-source tool, you should never commit your encrypted ciphertext into Git. Instead, `deploy.sh` can deploy directly to Cloudflare Pages edge:

1. In the [Cloudflare Dashboard](https://dash.cloudflare.com/), navigate to:
   **Workers & Pages** → **Create application** → **Pages** → **Direct Upload**.
2. Name your project (e.g. `my-recovery-vault`) and complete initial creation.
3. Configure your local `.env`:
   ```bash
   CLOUDFLARE_PAGES_PROJECT=my-recovery-vault
   CLOUDFLARE_API_TOKEN=your_api_token_here
   CLOUDFLARE_ACCOUNT_ID=your_account_id_here
   ```
4. Run the automated deployment script:
   ```bash
   ./scripts/deploy.sh payload.json
   ```
5. **Result:** `deploy.sh` encrypts your payload in an isolated temporary staging directory, uploads directly to Cloudflare Pages edge via Wrangler, shreds your plaintext `payload.json`, and leaves `public/index.html` in Git 100% clean with zero secrets!

### Method C: Manual Drag-and-Drop Direct Upload

If you compiled your vault via the offline web builder (`tools/builder.html`), you can deploy directly via the browser:
1. Place your downloaded `index.html` and `public/_headers` into a folder.
2. In Cloudflare Pages → your project → **Deployments** → **Create deployment**.
3. Drag and drop the folder into the upload zone.

---

## 2. Custom Domain (`sos.<yourdomain>.com`)

To access your vault from any browser with a clean, memorizable URL:

1. In Cloudflare Pages, go to your project → **Custom domains** tab.
2. Click **Set up a custom domain**.
3. Enter your desired subdomain (e.g. `sos.yourdomain.com`).
4. Cloudflare will automatically configure the DNS CNAME record and provision an edge SSL certificate.

---

## 3. Secondary DNS TXT Dead-Drop

If web browsing is blocked, Cloudflare Pages experiences an outage, or HTTP connectivity is restricted, your ciphertext can be retrieved via DNS TXT records.

### Automated Sync (via `deploy.sh`)

You can automate secondary dead-drop updates during every run of `scripts/deploy.sh`:

1. Create a scoped API Token in Cloudflare Dashboard:
   - Go to **My Profile** → **API Tokens** → **Create Token**.
   - Template: **Edit zone DNS**.
   - Permissions: `Zone` → `DNS` → `Edit`.
   - Zone Resources: `Include` → `Specific zone` → `yourdomain.com`.
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Set your token and zone ID:
   ```bash
   RECOVERY_DOMAIN=recovery.yourdomain.com
   CLOUDFLARE_API_TOKEN=your_api_token_here
   CLOUDFLARE_ZONE_ID=your_zone_id_here
   ```
4. Now, every execution of `./scripts/deploy.sh` will automatically synchronize the DNS TXT record with 120s TTL!

### Manual DNS Record Configuration

If you do not want to use the Cloudflare API (or if you are using the offline web builder `tools/builder.html`), add the record manually in your DNS provider:

| Field | Value | Notes |
|---|---|---|
| **Type** | `TXT` | Standard text record |
| **Name** | `recovery.yourdomain.com` (or `@` if using root) | Your configured `RECOVERY_DOMAIN` |
| **TTL** | `120` (or 2 minutes) | Low TTL ensures rapid rotation propagation |
| **Content** | `"<base64-ciphertext>"` | Base64 string produced by `builder.html` or `encrypt.js` |

> [!TIP]
> When using `tools/builder.html`, the deployment summary screen automatically formats this exact table with **1-click Copy** buttons for each field, making manual DNS updates instantaneous.

### Querying the Dead-Drop

From any terminal with standard DNS utilities:
```bash
# Query via dig:
dig +short TXT recovery.yourdomain.com | tr -d ' "\n'

# Or query via DNS-over-HTTPS (DoH):
curl -s -H "Accept: application/dns-json" "https://cloudflare-dns.com/dns-query?name=recovery.yourdomain.com&type=TXT"
```

---

## 4. Hosting on Netlify

Netlify is natively compatible with the existing [`public/_headers`](../public/_headers) file and the root [`netlify.toml`](../netlify.toml).

### Automated Direct Upload (Zero Git Persistence)

1. Create a site on Netlify (via Netlify Dashboard → **Sites** → **Add new site** → **Deploy manually**).
2. Copy your **API ID (Site ID)** from **Site configuration** → **General** → **Site details**.
3. Generate a Personal Access Token from **User settings** → **Applications** → **Personal access tokens**.
4. Configure `.env`:
   ```bash
   DEPLOY_PROVIDER=netlify
   NETLIFY_SITE_ID=your_site_id_here
   NETLIFY_AUTH_TOKEN=your_auth_token_here
   ```
5. Deploy:
   ```bash
   ./scripts/deploy.sh payload.json
   # Or explicitly: ./scripts/deploy.sh --provider netlify payload.json
   ```

---

## 5. Hosting on Vercel

Vercel is fully supported via the root [`vercel.json`](../vercel.json), which mirrors all security headers (`no-store`, strict CSP, HSTS, anti-clickjacking).

### Automated Direct Upload (Zero Git Persistence)

1. Generate a personal Access Token at [https://vercel.com/account/tokens](https://vercel.com/account/tokens).
2. Configure `.env`:
   ```bash
   DEPLOY_PROVIDER=vercel
   VERCEL_TOKEN=your_vercel_token_here
   # (Optional) link to a specific project:
   VERCEL_ORG_ID=your_org_id
   VERCEL_PROJECT_ID=your_project_id
   ```
3. Deploy:
   ```bash
   ./scripts/deploy.sh payload.json
   # Or explicitly: ./scripts/deploy.sh --provider vercel payload.json
   ```

---

## 6. Self-Hosted Static Web Servers (Caddy & Nginx)

If you self-host on your own server or VPS, apply these drop-in configurations to maintain identical edge security:

### Caddy (`Caddyfile`)
```caddy
sos.yourdomain.com {
    root * /var/www/sos/public
    file_server

    header {
        Content-Security-Policy "default-src 'none'; connect-src https://cloudflare-dns.com https://dns.google; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none';"
        X-Frame-Options "DENY"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "no-referrer"
        Permissions-Policy "geolocation=(), camera=(), microphone=(), payment=(), usb=()"
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        Cache-Control "no-cache, no-store, must-revalidate"
    }
}
```

### Nginx (`nginx.conf`)
```nginx
server {
    listen 443 ssl http2;
    server_name sos.yourdomain.com;
    root /var/www/sos/public;
    index index.html;

    add_header Content-Security-Policy "default-src 'none'; connect-src https://cloudflare-dns.com https://dns.google; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none';" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header Permissions-Policy "geolocation=(), camera=(), microphone=(), payment=(), usb=()" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header Cache-Control "no-cache, no-store, must-revalidate" always;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

---

## 7. Emergency Fallback: GitHub Pages

- **GitHub Pages:** Safe for dead-drop hosting. Set source to `/public` in repository settings.
- **Limitation:** GitHub Pages does not support custom HTTP response headers (`Cache-Control: no-store` and `X-Frame-Options` cannot be set at the server level). Treat GitHub Pages as a secondary or emergency fallback rather than a primary production deployment.

---

## 8. Decoupled Web Platform Architecture (`idrecoverykit.com`)

To adhere to the principle of least privilege and strict web origin isolation, the public product hub and hosted vault compiler for [**idrecoverykit.com**](https://idrecoverykit.com) are maintained in a completely separate repository: [**`janhrabcak/idrecoverykit-site`**](https://github.com/janhrabcak/idrecoverykit-site).

### Why Separate the Web Platform from the Protocol Repository?

1. **Origin & Attack Surface Isolation:** A public website requires marketing content, sitemaps, AI discovery manifests, and community media. Keeping it isolated in a separate repository ensures that public web changes can never compromise or introduce vulnerabilities into the core cryptographic recovery codebase.
2. **Zero Dependencies in Core Vault:** The `identity-recovery` repository requires zero external npm runtime or build packages, relying entirely on Node native APIs and browser WebCrypto (`crypto.subtle`).
3. **Independent Deployments & Access Control:** Public marketing releases do not trigger or interfere with personal recovery vault deployments or staleness checks.

### Deploying `idrecoverykit.com` from `idrecoverykit-site`

Within the standalone `idrecoverykit-site` repository:
```bash
# Verify integrity of standalone site assets
npm test

# Deploy to Cloudflare Pages (or Netlify/Vercel)
npm run deploy
# Or via CLI: ./scripts/deploy.sh --provider cloudflare --project idrecoverykit
```

### Configuring Custom Domain `idrecoverykit.com` (Cloudflare Registrar)

Because your domain is registered directly with Cloudflare Registrar:
1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages**.
2. Select the **`idrecoverykit`** Pages project (pointing to the `idrecoverykit-site` repository).
3. Open the **Custom domains** tab and click **Set up a custom domain**.
4. Enter `idrecoverykit.com` and click **Continue**. Cloudflare automatically adds the apex CNAME flattening record to your DNS zone.
5. Repeat for `www.idrecoverykit.com` (handled via `_redirects` to point to the apex).
6. Under **SSL/TLS** settings for your zone, ensure encryption mode is set to **Full (strict)**.

---

## 9. Modular Hosting Provider Architecture for Private Vaults

Private encrypted recovery terminals can be deployed to any major edge hosting provider using the modular provider framework in [`scripts/providers/`](../scripts/providers/):

```text
scripts/providers/
├── base-provider.js     # Shared security headers (CSP, HSTS, no-store) & BaseProvider interface
├── cloudflare.js        # Cloudflare Pages provider (_headers, wrangler.toml)
├── netlify.js           # Netlify provider (_headers, netlify.toml)
├── vercel.js            # Vercel provider (vercel.json)
├── github-pages.js      # GitHub Pages fallback provider (.nojekyll)
└── index.js             # Central provider registry & CLI runner
```

### Listing Providers & Capabilities

```bash
./scripts/deploy.sh --help
# Or: node scripts/providers/index.js list
```

### Deploying Your Private Encrypted Vault

```bash
# Cloudflare Pages (default):
./scripts/deploy.sh payload.json --provider cloudflare --project identity-recovery

# Netlify:
./scripts/deploy.sh payload.json --provider netlify --site <YOUR_NETLIFY_SITE_ID>

# Vercel:
./scripts/deploy.sh payload.json --provider vercel
```

### Adding a New Hosting Provider

To add a new provider (e.g., AWS S3/CloudFront, Firebase, Render):
1. Create `scripts/providers/<name>.js` extending `BaseProvider`.
2. Implement `generateConfigs(targetDir, options)` to emit edge security headers.
3. Implement `getDeployCommand(targetDir, options)` returning the CLI deployment command.
4. Register the new provider in [`scripts/providers/index.js`](../scripts/providers/index.js).

