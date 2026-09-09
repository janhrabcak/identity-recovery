/**
 * Cold-Start Identity Recovery Protocol - Base Hosting Provider Interface
 *
 * Defines the standard contract and shared security headers for all hosting providers.
 */

import fs from 'node:fs';
import path from 'node:path';

export const SECURITY_HEADERS = {
  cspLanding: "default-src 'none'; connect-src https://cloudflare-dns.com https://dns.google; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self' data: https:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none';",
  // CSP for encrypted vaults (strict data: only, zero external images)
  cspVault: "default-src 'none'; connect-src https://cloudflare-dns.com https://dns.google; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none';",
  frameOptions: "DENY",
  contentTypeOptions: "nosniff",
  referrerPolicy: "no-referrer",
  permissionsPolicy: "geolocation=(), camera=(), microphone=(), payment=(), usb=()",
  hsts: "max-age=31536000; includeSubDomains; preload",
  cacheStatic: "public, max-age=3600, must-revalidate",
  cacheNoStore: "no-cache, no-store, must-revalidate"
};

export class BaseProvider {
  constructor({ id, name, description, configFiles = [], envVars = [] }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.configFiles = configFiles;
    this.envVars = envVars;
  }

  /**
   * Generates edge security configs (headers, redirects, provider settings) in target directory.
   * @param {string} targetDir Target directory (e.g. site/ or public/)
   * @param {object} options Configuration options ({ hasApp, isVault, domain })
   */
  generateConfigs(targetDir, options = {}) {
    throw new Error(`generateConfigs() not implemented for provider ${this.id}`);
  }

  /**
   * Returns the CLI deploy command string for direct edge upload.
   * @param {string} targetDir
   * @param {object} options
   */
  getDeployCommand(targetDir, options = {}) {
    throw new Error(`getDeployCommand() not implemented for provider ${this.id}`);
  }

  /**
   * Validates whether necessary credentials exist in environment for direct deployment.
   * @param {object} env
   */
  validateEnv(env = process.env) {
    const missing = this.envVars.filter(v => v.required && !env[v.name]);
    return {
      valid: missing.length === 0,
      missing: missing.map(m => m.name)
    };
  }

  /**
   * Safely write a config file into target directory.
   */
  writeFile(targetDir, filename, content) {
    fs.mkdirSync(targetDir, { recursive: true });
    const filePath = path.join(targetDir, filename);
    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
  }
}
