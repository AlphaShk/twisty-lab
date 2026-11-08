export const JPERM_URL = 'https://jperm.net/algs/oll';
export const SOURCE_URL = 'https://github.com/AlphaShk/twisty-lab';
export const CUBING_URL = 'https://js.cubing.net/cubing/';
export const CUBING_SOURCE_URL = 'https://github.com/cubing/cubing.js';
export const LUCIDE_URL = 'https://lucide.dev';
/** Written into the web build by scripts/third-party-licenses.mjs. */
export const LICENSES_URL = './third-party-licenses.txt';

// The Electron preload script exposes `window.desktop`; in a browser it is undefined.
export const isDesktop = typeof window !== 'undefined' && window.desktop !== undefined;
