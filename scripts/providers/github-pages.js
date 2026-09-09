/**
 * GitHub Pages Hosting Provider Module
 */

import { BaseProvider } from './base-provider.js';

export class GitHubPagesProvider extends BaseProvider {
  constructor() {
    super({
      id: 'github-pages',
      name: 'GitHub Pages',
      description: 'Static website hosting directly from docs/ or gh-pages branch (Zero-cost fallback)',
      configFiles: ['.nojekyll']
    });
  }

  generateConfigs(targetDir, options = {}) {
    // Prevent Jekyll processing so underscore files like _headers are served intact
    this.writeFile(targetDir, '.nojekyll', '');
  }

  getDeployCommand(targetDir, options = {}) {
    return 'git push origin main';
  }
}

export const gitHubPagesProvider = new GitHubPagesProvider();
