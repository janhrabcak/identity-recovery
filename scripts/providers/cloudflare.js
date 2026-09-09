/**
 * Cloudflare Pages Hosting Provider Module
 */

import { BaseProvider, SECURITY_HEADERS } from './base-provider.js';

export class CloudflareProvider extends BaseProvider {
  constructor() {
    super({
      id: 'cloudflare',
      name: 'Cloudflare Pages',
      description: 'Global Anycast serverless edge network with native _headers, _redirects, and private repo support',
      configFiles: ['_headers', '_redirects', 'wrangler.toml'],
      envVars: [
        { name: 'CLOUDFLARE_PAGES_PROJECT', required: false, description: 'Pages project name for vault' },
        { name: 'CLOUDFLARE_PAGES_SITE_PROJECT', required: false, description: 'Pages project name for web platform' },
        { name: 'CLOUDFLARE_API_TOKEN', required: false, description: 'Cloudflare API token for headless upload' },
        { name: 'CLOUDFLARE_ACCOUNT_ID', required: false, description: 'Cloudflare Account ID' }
      ]
    });
  }

  generateConfigs(targetDir, options = {}) {
    const isVault = !!options.isVault;
    const hasApp = !!options.hasApp;
    const domain = options.domain || 'idrecoverykit.com';
    const csp = isVault ? SECURITY_HEADERS.cspVault : SECURITY_HEADERS.cspLanding;
    const rootCache = isVault ? SECURITY_HEADERS.cacheNoStore : SECURITY_HEADERS.cacheStatic;

    // 1. Generate _headers
    let headersContent = `/*
  Content-Security-Policy: ${csp}
  X-Frame-Options: ${SECURITY_HEADERS.frameOptions}
  X-Content-Type-Options: ${SECURITY_HEADERS.contentTypeOptions}
  Referrer-Policy: ${SECURITY_HEADERS.referrerPolicy}
  Permissions-Policy: ${SECURITY_HEADERS.permissionsPolicy}
  Strict-Transport-Security: ${SECURITY_HEADERS.hsts}
  Cache-Control: ${rootCache}
`;

    if (hasApp) {
      headersContent += `
/app/*
  Cache-Control: ${SECURITY_HEADERS.cacheNoStore}
`;
    }

    this.writeFile(targetDir, '_headers', headersContent);

    // 2. Generate _redirects (Cloudflare requires all redirect paths to be relative)
    if (!isVault) {
      const redirectsContent = `# Cloudflare redirects for ${domain}
/vault /app/ 301
/builder /app/ 301
`;
      this.writeFile(targetDir, '_redirects', redirectsContent);
    }
  }

  getDeployCommand(targetDir, options = {}) {
    const projectName = options.projectName || options.project || 'idrecoverykit';
    const branch = options.branch || 'main';
    return `npx --yes wrangler pages deploy "${targetDir}" --project-name="${projectName}" --branch="${branch}" --commit-dirty=true`;
  }
}

export const cloudflareProvider = new CloudflareProvider();
