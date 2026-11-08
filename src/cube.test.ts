import type { KPuzzle } from 'cubing/kpuzzle';
import { cube3x3x3 } from 'cubing/puzzles';
import { beforeAll, describe, expect, it } from 'vitest';
import { jpermAlgorithms, jpermAlignment } from './algorithms';
import { verifyAlgorithm } from './cube';
import { alignedJpermAlgorithm, builtInAlgorithmCount, ollCases } from './data';
import { moveSequenceKey, startsWithStackedRotations } from './notation';
import {
  assertLastLayerCase,
  lastLayerOrientation,
  ollCasePattern,
  orientationKey,
} from './ollDiagram';

const caseByNumber = new Map(ollCases.map((item) => [item.number, item]));
const referenceFor = (number: number) => caseByNumber.get(number)!.algorithm;

let kpuzzle: KPuzzle;
beforeAll(async () => {
  kpuzzle = await cube3x3x3.kpuzzle();
});

describe('reference data', () => {
  it('covers OLL 1 to 57 in order', () => {
    expect(ollCases.map((item) => item.number)).toEqual(
      Array.from({ length: 57 }, (_, index) => index + 1),
    );
  });

  // The default defines the case (its inverse sets it up), so verifying it
  // against itself would prove nothing. Instead: it must be an OLL algorithm.
  it.each(ollCases.map((item) => [item.number, item.algorithm] as const))(
    'OLL %i default sets up an unsolved last-layer case: %s',
    (_number, algorithm) => {
      const pattern = ollCasePattern(kpuzzle, algorithm);
      expect(() => assertLastLayerCase(pattern)).not.toThrow();
      const solved = orientationKey(lastLayerOrientation(kpuzzle.defaultPattern()));
      expect(orientationKey(lastLayerOrientation(pattern))).not.toBe(solved);
    },
  );

  it('only aligns JPerm listings that exist', () => {
    for (const key of Object.keys(jpermAlignment)) {
      const [number, listing] = key.split('-').map(Number);
      expect(jpermAlgorithms[number]?.[listing - 1], key).toBeDefined();
    }
  });

  it('shows 114 built-in algorithms: 57 defaults and 57 distinct JPerm listings', () => {
    const alternatives = ollCases.reduce((total, item) => total + item.jpermAlternatives.length, 0);
    expect(alternatives).toBe(57);
    expect(builtInAlgorithmCount).toBe(114);
  });

  it('shows no algorithm twice and none that starts with two rotations', () => {
    for (const item of ollCases) {
      const shown = [item.algorithm, ...item.jpermAlternatives.map(({ algorithm }) => algorithm)];
      const keys = shown.map(moveSequenceKey);
      expect(new Set(keys).size, `OLL ${item.number}`).toBe(keys.length);
      for (const algorithm of shown) {
        expect(startsWithStackedRotations(algorithm), `OLL ${item.number}: ${algorithm}`).toBe(
          false,
        );
      }
    }
  });

  it('shows every JPerm listing exactly as the cross-check below verifies it', () => {
    for (const item of ollCases) {
      for (const { listing, algorithm } of item.jpermAlternatives) {
        expect(algorithm).toBe(alignedJpermAlgorithm(item.number, listing));
      }
    }
  });

  it('notes the JPerm listing that a default matches', () => {
    expect(caseByNumber.get(27)!.defaultListing).toBe(1);
    // R' R' in JPerm's listing against R2' in the default.
    expect(caseByNumber.get(1)!.defaultListing).toBe(1);
    // The default for OLL 21 is JPerm's listing 2 after a y2 that changes nothing.
    expect(caseByNumber.get(21)!.defaultListing).toBe(2);
    expect(caseByNumber.get(21)!.jpermAlternatives.map(({ listing }) => listing)).toEqual([1]);
    // 28 defaults are JPerm listings verbatim, 13 more differ only in notation.
    const matched = ollCases.filter((item) => item.defaultListing !== null).length;
    expect(matched).toBe(41);
  });
});

describe('every JPerm listing solves the case set up by the default', () => {
  const listings = Object.entries(jpermAlgorithms).flatMap(([number, algorithms]) =>
    algorithms.map(
      (_, index) =>
        [Number(number), index + 1, alignedJpermAlgorithm(Number(number), index + 1)] as const,
    ),
  );

  it('includes all 98 JPerm listings', () => {
    expect(listings).toHaveLength(98);
  });

  it.each(listings)('OLL %i JPerm %i: %s', async (number, _listing, algorithm) => {
    const result = await verifyAlgorithm(referenceFor(number), algorithm);
    // No extra U turn: the alignment rotation must match JPerm's picture to the case as set up.
    expect(result).toMatchObject({
      correct: true,
      ollSolved: true,
      f2lPreserved: true,
      preAuf: '',
    });
  });
});

describe('verifyAlgorithm acceptance rules', () => {
  const sune = referenceFor(27);

  it('accepts a different final AUF', async () => {
    expect((await verifyAlgorithm(sune, `${sune} U`)).correct).toBe(true);
  });

  it('accepts a trailing whole-cube rotation', async () => {
    expect((await verifyAlgorithm(sune, `${sune} x y2`)).correct).toBe(true);
  });

  it('counts moves without rotations', async () => {
    const result = await verifyAlgorithm(referenceFor(13), "r U' r' U' r U r' y' R' U R");
    expect(result.correct).toBe(true);
    expect(result.moveCount).toBe(10);
  });

  it('finds the U turn an algorithm needs first and puts it in front', async () => {
    const headlights = referenceFor(21);
    const result = await verifyAlgorithm(headlights, "F (R U R' U')3 F'");
    expect(result).toMatchObject({
      correct: true,
      preAuf: 'U',
      normalized: "U F (R U R' U')3 F'",
      moveCount: 14,
      message: 'Correct with U first. OLL is solved and F2L stays intact.',
    });
    expect(await verifyAlgorithm(headlights, result.normalized)).toMatchObject({
      correct: true,
      preAuf: '',
    });
    expect(await verifyAlgorithm(headlights, "y F (R U R' U')3 F'")).toMatchObject({
      correct: true,
      preAuf: '',
    });
  });
});

describe('verifyAlgorithm rejects wrong input', () => {
  const sune = referenceFor(27);

  it('rejects an algorithm that orients the last layer but breaks F2L', async () => {
    const result = await verifyAlgorithm(sune, `${sune} D`);
    expect(result).toMatchObject({
      correct: false,
      syntaxValid: true,
      ollSolved: true,
      f2lPreserved: false,
    });
    expect(result.message).toBe('OLL is oriented, but the algorithm changes an F2L piece.');
  });

  it('rejects an algorithm that breaks F2L and leaves OLL unsolved', async () => {
    const result = await verifyAlgorithm(sune, "R U R'");
    expect(result).toMatchObject({
      correct: false,
      syntaxValid: true,
      ollSolved: false,
      f2lPreserved: false,
    });
    expect(result.message).toBe('This changes an F2L piece and leaves OLL unoriented.');
  });

  it('rejects an OLL algorithm for a different case, whatever U turn comes first', async () => {
    const result = await verifyAlgorithm(referenceFor(21), sune);
    expect(result).toMatchObject({
      correct: false,
      syntaxValid: true,
      ollSolved: false,
      f2lPreserved: true,
    });
    expect(result.message).toBe(
      'F2L stays intact, but at least one top sticker remains unoriented.',
    );
  });

  it.each([
    [
      "(R U R'",
      'Syntax error: unbalanced brackets. Every "(" needs a ")" and every "[" needs a "]".',
    ],
    [
      'R U [R',
      'Syntax error: unbalanced brackets. Every "(" needs a ")" and every "[" needs a "]".',
    ],
    ["R U R''", 'Syntax error: unexpected "\'".'],
  ])('describes the syntax error in %s', async (algorithm, message) => {
    const result = await verifyAlgorithm(sune, algorithm);
    expect(result).toMatchObject({ correct: false, syntaxValid: false, moveCount: 0, message });
    expect(result.detail).toBeTruthy();
  });

  it('names a move the 3x3x3 cube does not have', async () => {
    const result = await verifyAlgorithm(sune, 'R U Q');
    expect(result).toMatchObject({
      correct: false,
      syntaxValid: false,
      message: 'Q is not a move on a 3x3x3 cube.',
    });
  });

  it.each(['', '   '])('asks for at least one move when the input is %j', async (algorithm) => {
    const result = await verifyAlgorithm(sune, algorithm);
    expect(result).toMatchObject({
      correct: false,
      syntaxValid: false,
      message: 'Enter at least one move.',
    });
  });
});
