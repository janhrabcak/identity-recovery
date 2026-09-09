/**
 * Netlify Hosting Provider Module
 */

import { BaseProvider, SECURITY_HEADERS } from './base-provider.js';

export class NetlifyProvider extends BaseProvider {
  constructor() {
    super({
      id: 'netlify',
      name: 'Netlify',
      description: 'Serverless web host with native _headers and netlify.toml edge security directives',
      configFiles: ['_headers', 'netlify.toml'],
      envVars: [
        { name: 'NETLIFY_SITE_ID', required: false, description: 'Netlify Site ID' },
        { name: 'NETLIFY_AUTH_TOKEN', required: false, description: 'Netlify Personal Access Token' }
      ]
    });
  }

  generateConfigs(targetDir, options = {}) {
    const isVault = !!options.isVault;
    const hasApp = !!options.hasApp;
    const csp = isVault ? SECURITY_HEADERS.cspVault : SECURITY_HEADERS.cspLanding;

    // 1. Generate netlify.toml
    let netlifyToml = `[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "${csp}"
    X-Frame-Options = "${SECURITY_HEADERS.frameOptions}"
    X-Content-Type-Options = "${SECURITY_HEADERS.contentTypeOptions}"
    Referrer-Policy = "${SECURITY_HEADERS.referrerPolicy}"
    Permissions-Policy = "${SECURITY_HEADERS.permissionsPolicy}"
    Strict-Transport-Security = "${SECURITY_HEADERS.hsts}"
`;

    if (isVault) {
      netlifyToml += `    Cache-Control = "${SECURITY_HEADERS.cacheNoStore}"\n`;
    }

    if (hasApp) {
      netlifyToml += `
[[headers]]
  for = "/app/*"
  [headers.values]
    Cache-Control = "${SECURITY_HEADERS.cacheNoStore}"
`;
    }

    this.writeFile(targetDir, 'netlify.toml', netlifyToml);
  }

  getDeployCommand(targetDir, options = {}) {
    let cmd = `npx --yes netlify-cli deploy --dir="${targetDir}" --prod`;
    const siteId = options.siteId || options.site || process.env.NETLIFY_SITE_ID;
    const authToken = options.authToken || options.auth || process.env.NETLIFY_AUTH_TOKEN;

    if (siteId) {
      cmd += ` --site="${siteId}"`;
    }
    if (authToken) {
      cmd += ` --auth="${authToken}"`;
    }
    return cmd;
  }
}

export const netlifyProvider = new NetlifyProvider();
