/**
 * Cold-Start Identity Recovery Protocol - Hosting Provider Registry & CLI
 */

import { cloudflareProvider } from './cloudflare.js';
import { netlifyProvider } from './netlify.js';
import { vercelProvider } from './vercel.js';
import { gitHubPagesProvider } from './github-pages.js';

export { SECURITY_HEADERS, BaseProvider } from './base-provider.js';
export { cloudflareProvider } from './cloudflare.js';
export { netlifyProvider } from './netlify.js';
export { vercelProvider } from './vercel.js';
export { gitHubPagesProvider } from './github-pages.js';

export const providers = {
  cloudflare: cloudflareProvider,
  netlify: netlifyProvider,
  vercel: vercelProvider,
  'github-pages': gitHubPagesProvider
};

/**
 * Retrieve a provider by identifier.
 * @param {string} id Provider identifier (e.g. 'cloudflare', 'netlify', 'vercel')
 */
export function getProvider(id) {
  const key = (id || '').toLowerCase().trim();
  const provider = providers[key];
  if (!provider) {
    const valid = Object.keys(providers).join(', ');
    throw new Error(`Unknown hosting provider '${id}'. Valid providers: ${valid}`);
  }
  return provider;
}

/**
 * Generate configuration files for all registered providers in target directory.
 * @param {string} targetDir Target directory
 * @param {object} options Options ({ hasApp, isVault, domain })
 */
export function generateAllConfigs(targetDir, options = {}) {
  for (const provider of Object.values(providers)) {
    provider.generateConfigs(targetDir, options);
  }
}

/**
 * List metadata for all registered providers.
 */
export function listProviders(env = process.env) {
  return Object.values(providers).map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    configFiles: p.configFiles,
    envStatus: p.validateEnv(env)
  }));
}

// CLI Execution Support
if (process.argv[1] && process.argv[1].endsWith('providers/index.js')) {
  const [,, command, arg1, arg2, arg3] = process.argv;

  if (command === 'list') {
    console.log('\nSupported Hosting Providers:');
    console.log('------------------------------------------------------------');
    for (const p of listProviders()) {
      const status = p.envStatus.valid ? '✓ Configured' : '○ Needs setup';
      console.log(`• ${p.name.padEnd(18)} [${p.id}] - ${status}`);
      console.log(`  ${p.description}`);
      console.log(`  Files: ${p.configFiles.join(', ')}`);
      if (p.envStatus.missing.length > 0) {
        console.log(`  Missing Env: ${p.envStatus.missing.join(', ')}`);
      }
      console.log();
    }
  } else if (command === 'generate') {
    const targetDir = arg1 || 'site';
    generateAllConfigs(targetDir, { hasApp: true, domain: 'idrecoverykit.com' });
    console.log(`✓ Generated configs for all providers in ${targetDir}`);
  } else if (command === 'deploy-cmd') {
    const providerId = arg1 || 'cloudflare';
    const targetDir = arg2 || 'site';
    let opts = {};
    if (arg3) {
      try { opts = JSON.parse(arg3); } catch (_) {}
    }
    const provider = getProvider(providerId);
    console.log(provider.getDeployCommand(targetDir, opts));
  } else {
    console.log('Usage: node scripts/providers/index.js <list|generate|deploy-cmd> [args]');
  }
}
