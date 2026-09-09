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

## 4. Alternative Hosting Targets

- **GitHub Pages:** Safe for dead-drop hosting. Set source to `/public` in repository settings. *Note: Requires a public repository on the free tier.*
- **Self-Hosted Static Web Server:** Copy `public/index.html` to any Nginx/Apache/Caddy webroot. Ensure you apply the security headers from `public/_headers` in your web server configuration.
