/**
 * Vercel Hosting Provider Module
 */

import { BaseProvider, SECURITY_HEADERS } from './base-provider.js';

export class VercelProvider extends BaseProvider {
  constructor() {
    super({
      id: 'vercel',
      name: 'Vercel',
      description: 'Edge network with vercel.json headers specification and preview deployments',
      configFiles: ['vercel.json'],
      envVars: [
        { name: 'VERCEL_TOKEN', required: false, description: 'Vercel CLI access token' },
        { name: 'VERCEL_ORG_ID', required: false, description: 'Vercel Organization ID' },
        { name: 'VERCEL_PROJECT_ID', required: false, description: 'Vercel Project ID' }
      ]
    });
  }

  generateConfigs(targetDir, options = {}) {
    const isVault = !!options.isVault;
    const hasApp = !!options.hasApp;
    const csp = isVault ? SECURITY_HEADERS.cspVault : SECURITY_HEADERS.cspLanding;

    const rootHeaders = [
      { key: "Content-Security-Policy", value: csp },
      { key: "X-Frame-Options", value: SECURITY_HEADERS.frameOptions },
      { key: "X-Content-Type-Options", value: SECURITY_HEADERS.contentTypeOptions },
      { key: "Referrer-Policy", value: SECURITY_HEADERS.referrerPolicy },
      { key: "Permissions-Policy", value: SECURITY_HEADERS.permissionsPolicy },
      { key: "Strict-Transport-Security", value: SECURITY_HEADERS.hsts }
    ];

    if (isVault) {
      rootHeaders.push({ key: "Cache-Control", value: SECURITY_HEADERS.cacheNoStore });
    }

    const headers = [
      {
        source: "/(.*)",
        headers: rootHeaders
      }
    ];

    if (hasApp) {
      headers.push({
        source: "/app/(.*)",
        headers: [
          { key: "Cache-Control", value: SECURITY_HEADERS.cacheNoStore }
        ]
      });
    }

    const config = {
      cleanUrls: true,
      headers
    };

    this.writeFile(targetDir, 'vercel.json', JSON.stringify(config, null, 2) + '\n');
  }

  getDeployCommand(targetDir, options = {}) {
    let cmd = `npx --yes vercel deploy "${targetDir}" --prod --yes`;
    const token = options.token || process.env.VERCEL_TOKEN;
    if (token) {
      cmd += ` --token="${token}"`;
    }
    return cmd;
  }
}

export const vercelProvider = new VercelProvider();
