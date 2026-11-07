import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

describe('styles.css', () => {
  it('never sets a font size below 12px', () => {
    const declarations = [...css.matchAll(/font-size:\s*([^;}]+)/g)].map((match) => match[1].trim());
    expect(declarations.length).toBeGreaterThan(0);
    for (const value of declarations) {
      expect(value, `font-size: ${value}`).not.toMatch(/\d(?:em|rem|%)|small/);
      for (const [, px] of value.matchAll(/(\d+(?:\.\d+)?)px/g)) {
        expect(Number(px), `font-size: ${value}`).toBeGreaterThanOrEqual(12);
      }
    }
  });
});
