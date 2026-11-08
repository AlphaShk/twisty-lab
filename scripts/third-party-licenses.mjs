// Vite plugin that writes the licence of every npm package in the web build to
// dist/third-party-licenses.txt. Minification strips the licence comments from
// the bundled code, and the MIT and ISC licences require the notice in copies.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Module ids of CommonJS proxies start with a NUL byte, so it is skipped.
const PACKAGE_ROOT = /^\0?(.*node_modules\/((?:@[^/]+\/)?[^/]+))\//;
const LICENSE_FILE = /^(licen[cs]e|copying)(\.(md|txt))?$/i;

function packageSection(root) {
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const licenseFile = readdirSync(root).find((file) => LICENSE_FILE.test(file));
  const repository =
    typeof manifest.repository === 'string' ? manifest.repository : manifest.repository?.url;
  return [
    `${manifest.name} ${manifest.version}`,
    `License: ${manifest.license ?? 'see below'}`,
    ...(repository ? [`Source: ${repository.replace(/^git\+/, '')}`] : []),
    '',
    licenseFile
      ? readFileSync(join(root, licenseFile), 'utf8').trim()
      : '(The package ships no licence file.)',
  ].join('\n');
}

export function thirdPartyLicenses({ fileName = 'third-party-licenses.txt' } = {}) {
  return {
    name: 'third-party-licenses',
    apply: 'build',
    generateBundle(_options, bundle) {
      const roots = new Map();
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue;
        for (const id of Object.keys(output.modules)) {
          const match = PACKAGE_ROOT.exec(id);
          if (match) roots.set(match[2], match[1]);
        }
      }
      const sections = [...roots.keys()].sort().map((name) => packageSection(roots.get(name)));
      const header =
        'Twisty Lab bundles the following third-party packages. Each is used under its own licence.';
      this.emitFile({
        type: 'asset',
        fileName,
        source: `${header}\n\n${sections.join(`\n\n${'='.repeat(72)}\n\n`)}\n`,
      });
    },
  };
}
