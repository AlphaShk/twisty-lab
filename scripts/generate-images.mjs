// Generates the OLL case diagrams (public/oll/<n>.svg), the favicon and the
// app icon source (build/icon.svg) from the reference algorithms.
//
//   npm run generate:images            write the files
//   npm run generate:images -- --check exit 1 if a committed file is stale
//
// Requires Node 22.18+ (it imports TypeScript sources via type stripping).
// build/icon.png, which electron-builder needs, is a 512 x 512 rasterisation of
// build/icon.svg, e.g. with headless Chrome:
//   chrome --headless --window-size=512,512 --default-background-color=00000000 \
//     --screenshot=build/icon.png build/icon.svg

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cube3x3x3 } from 'cubing/puzzles';
import { preferredAlgorithms } from '../src/algorithms.ts';
import { lastLayerOrientation, ollCasePattern, ollDiagramShapes, renderOllSvg } from '../src/ollDiagram.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const ICON_CASE = 27;

const kpuzzle = await cube3x3x3.kpuzzle();
const stateFor = (number) => lastLayerOrientation(ollCasePattern(kpuzzle, preferredAlgorithms[number]));

const files = new Map();
for (let number = 1; number <= 57; number += 1) {
  files.set(`public/oll/${number}.svg`, renderOllSvg(stateFor(number), { title: `OLL ${number}` }));
}

const iconShapes = ollDiagramShapes(stateFor(ICON_CASE)).map((shape) => `    ${shape}`).join('\n');
files.set('public/favicon.svg', renderOllSvg(stateFor(ICON_CASE), { size: 32 }));
files.set('build/icon.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="paper" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fbfbf7"/>
      <stop offset="1" stop-color="#e6eae3"/>
    </linearGradient>
  </defs>
  <rect x="48" y="48" width="416" height="416" rx="92" fill="url(#paper)" stroke="#cfd7d0" stroke-width="3"/>
  <g transform="translate(111 111) scale(2.9)">
${iconShapes}
  </g>
</svg>
`);

let stale = 0;
for (const [path, content] of files) {
  const target = join(root, path);
  if (check) {
    const current = await readFile(target, 'utf8').catch(() => null);
    if (current !== content) {
      stale += 1;
      console.error(`stale: ${path}`);
    }
    continue;
  }
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content);
}

if (check && stale) {
  console.error(`${stale} generated file(s) are out of date. Run npm run generate:images.`);
  process.exit(1);
}
console.log(check ? `All ${files.size} generated files are up to date.` : `Wrote ${files.size} files.`);
