import { describe, expect, it } from 'vitest';
import { countMoves, displayAlg, parseAlg, splitIntoPhrases } from './notation';

describe('notation helpers', () => {
  it('pretty-prints doubles and primes', () => {
    expect(displayAlg("R U2' R'")).toBe('R U²′ R′');
  });

  it('returns null for notation that does not parse', () => {
    expect(parseAlg("R U R''")).toBeNull();
    expect(parseAlg("R U R'")?.toString()).toBe("R U R'");
  });

  it('counts moves without rotations, expanding groupings', () => {
    expect(countMoves(parseAlg("y' (R U R' U')2 // two sexy moves")!)).toBe(8);
  });

  it('splits an algorithm into phrases of four moves', () => {
    const phrases = splitIntoPhrases("R U2' R2' F R F' U2' R' F R F'");
    expect(phrases.map((phrase) => phrase.moves)).toEqual(["R U2' R2' F", "R F' U2' R'", "F R F'"]);
    expect(phrases.map((phrase) => phrase.before)).toEqual(['', "R U2' R2' F", "R U2' R2' F R F' U2' R'"]);
    expect(phrases[1].label).toBe('R F′ U²′ R′');
  });

  it('flattens groupings so every phrase can be replayed on its own', () => {
    expect(splitIntoPhrases("(R U2 R') U' R U' R'").map((phrase) => phrase.moves)).toEqual(["R U2 R' U'", "R U' R'"]);
  });

  it('returns no phrases for invalid or empty notation', () => {
    expect(splitIntoPhrases("R U (R'")).toEqual([]);
    expect(splitIntoPhrases('   ')).toEqual([]);
  });
});
