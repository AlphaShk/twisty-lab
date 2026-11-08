import { describe, expect, it } from 'vitest';
import {
  countMoves,
  displayAlg,
  moveSequenceKey,
  parseAlg,
  prependRotation,
  splitIntoPhrases,
  startsWithStackedRotations,
} from './notation';

describe('notation helpers', () => {
  it('pretty-prints doubles and primes', () => {
    expect(displayAlg("R U2' R'")).toBe('R U²′ R′');
  });

  it('returns null for notation that does not parse', () => {
    expect(parseAlg("R U R''")).toBeNull();
    expect(parseAlg("R U R'")?.toString()).toBe("R U R'");
  });

  it('counts moves without rotations, expanding groupings', () => {
    expect(countMoves(parseAlg("y' (R U R' U')2 // two R U R' U' triggers")!)).toBe(8);
  });

  it('splits an algorithm into phrases of four moves', () => {
    const phrases = splitIntoPhrases("R U2' R2' F R F' U2' R' F R F'");
    expect(phrases.map((phrase) => phrase.moves)).toEqual(["R U2' R2' F", "R F' U2' R'", "F R F'"]);
    expect(phrases.map((phrase) => phrase.before)).toEqual([
      '',
      "R U2' R2' F",
      "R U2' R2' F R F' U2' R'",
    ]);
    expect(phrases[1].label).toBe('R F′ U²′ R′');
  });

  it('does not count rotations towards the phrase size', () => {
    expect(splitIntoPhrases("y F R U R' U' F'").map((phrase) => phrase.moves)).toEqual([
      "y F R U R'",
      "U' F'",
    ]);
    expect(splitIntoPhrases("R U R' U' y R U y2").map((phrase) => phrase.moves)).toEqual([
      "R U R' U'",
      'y R U y2',
    ]);
    expect(splitIntoPhrases("R U R' U' y").map((phrase) => phrase.moves)).toEqual(["R U R' U' y"]);
  });

  it('flattens groupings so every phrase can be replayed on its own', () => {
    expect(splitIntoPhrases("(R U2 R') U' R U' R'").map((phrase) => phrase.moves)).toEqual([
      "R U2 R' U'",
      "R U' R'",
    ]);
  });

  it('returns no phrases for invalid or empty notation', () => {
    expect(splitIntoPhrases("R U (R'")).toEqual([]);
    expect(splitIntoPhrases('   ')).toEqual([]);
  });

  it('merges a prepended rotation with a leading rotation about the same axis', () => {
    expect(prependRotation('y', 'y R U')).toBe('y2 R U');
    expect(prependRotation("y'", 'y R U')).toBe('R U');
    expect(prependRotation('y2', "y2 R U R'")).toBe("R U R'");
    expect(prependRotation('y', 'y2 R')).toBe("y' R");
    expect(prependRotation('y', 'x R')).toBe('y x R');
    expect(prependRotation('y2', '(R U2 R) U')).toBe('y2 (R U2 R) U');
    expect(() => prependRotation('R', 'U')).toThrow();
  });

  it('gives algorithms with the same moves the same key', () => {
    expect(moveSequenceKey("R U2 R' R' F")).toBe(moveSequenceKey("R U2' R2' F"));
    expect(moveSequenceKey("y y R U R'")).toBe(moveSequenceKey("R U R'"));
    expect(moveSequenceKey("(R U R') U'")).toBe("R U R' U'");
    expect(moveSequenceKey('R R R R U')).toBe('U');
    expect(moveSequenceKey("R U R'")).not.toBe(moveSequenceKey("R U' R'"));
    expect(moveSequenceKey("r' R2 U")).toBe("r' R2 U");
  });

  it('spots two rotations at the start', () => {
    expect(startsWithStackedRotations('y y R')).toBe(true);
    expect(startsWithStackedRotations("y2 y' R")).toBe(true);
    expect(startsWithStackedRotations('y R y')).toBe(false);
    expect(startsWithStackedRotations('R')).toBe(false);
  });
});
