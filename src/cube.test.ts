import { describe, expect, it } from 'vitest';
import { jpermAlgorithms, jpermAlignment } from './algorithms';
import { verifyAlgorithm } from './cube';
import { ollCases } from './data';

const caseByNumber = new Map(ollCases.map((item) => [item.number, item]));
const referenceFor = (number: number) => caseByNumber.get(number)!.algorithm;

describe('reference data', () => {
  it('covers OLL 1 to 57 in order', () => {
    expect(ollCases.map((item) => item.number)).toEqual(Array.from({ length: 57 }, (_, index) => index + 1));
  });

  it('lists 121 built-in algorithms once duplicates of the preferred one are removed', () => {
    const builtIn = ollCases.reduce((total, item) => total + 1 + item.websiteAlgorithms.length, 0);
    expect(builtIn).toBe(121);
  });

  it('only aligns JPerm variants that exist', () => {
    for (const key of Object.keys(jpermAlignment)) {
      const [number, index] = key.split('-').map(Number);
      expect(jpermAlgorithms[number]?.[index - 1], key).toBeDefined();
    }
  });
});

describe('verifyAlgorithm accepts every built-in algorithm', () => {
  it.each(ollCases.map((item) => [item.number, item.algorithm] as const))(
    'OLL %i preferred: %s',
    async (number, algorithm) => {
      const result = await verifyAlgorithm(algorithm, algorithm);
      expect(result).toMatchObject({ correct: true, syntaxValid: true, ollSolved: true, f2lPreserved: true });
    },
  );

  // Every JPerm listing, including the ones hidden in the UI as duplicates,
  // with the whole-cube rotation that aligns it to the reference case.
  const jpermVariants = Object.entries(jpermAlgorithms).flatMap(([number, algorithms]) => algorithms.map((algorithm, index) => {
    const alignment = jpermAlignment[`${number}-${index + 1}`];
    return [Number(number), index + 1, alignment ? `${alignment} ${algorithm}` : algorithm] as const;
  }));

  it('includes all 98 JPerm listings', () => {
    expect(jpermVariants).toHaveLength(98);
  });

  it.each(jpermVariants)('OLL %i JPerm %i: %s', async (number, _index, algorithm) => {
    const result = await verifyAlgorithm(referenceFor(number), algorithm);
    expect(result).toMatchObject({ correct: true, ollSolved: true, f2lPreserved: true });
  });

  it.each(ollCases.flatMap((item) => item.websiteAlgorithms.map((algorithm) => [item.number, algorithm] as const)))(
    'OLL %i variant shown in the UI: %s',
    async (number, algorithm) => {
      expect((await verifyAlgorithm(referenceFor(number), algorithm)).correct).toBe(true);
    },
  );
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

  it('starts from the case as displayed, so a needed pre-rotation must be part of the algorithm', async () => {
    const headlights = referenceFor(21);
    const withoutRotation = await verifyAlgorithm(headlights, "F (R U R' U')3 F'");
    expect(withoutRotation).toMatchObject({ correct: false, ollSolved: false, f2lPreserved: true });
    expect((await verifyAlgorithm(headlights, "y F (R U R' U')3 F'")).correct).toBe(true);
    expect((await verifyAlgorithm(headlights, "U F (R U R' U')3 F'")).correct).toBe(true);
  });
});

describe('verifyAlgorithm rejects wrong input', () => {
  const sune = referenceFor(27);

  it('rejects an algorithm that orients the last layer but breaks F2L', async () => {
    const result = await verifyAlgorithm(sune, `${sune} D`);
    expect(result).toMatchObject({ correct: false, syntaxValid: true, ollSolved: true, f2lPreserved: false });
    expect(result.message).toBe('OLL is oriented, but the algorithm changes an F2L piece.');
  });

  it('rejects an algorithm that breaks F2L and leaves OLL unsolved', async () => {
    const result = await verifyAlgorithm(sune, "R U R'");
    expect(result).toMatchObject({ correct: false, syntaxValid: true, ollSolved: false, f2lPreserved: false });
  });

  it('rejects an OLL algorithm for a different case', async () => {
    const result = await verifyAlgorithm(referenceFor(21), sune);
    expect(result).toMatchObject({ correct: false, syntaxValid: true, ollSolved: false, f2lPreserved: true });
    expect(result.message).toBe('F2L stays intact, but at least one top sticker remains unoriented.');
  });

  it.each(["R U R''", "(R U R'", 'R U [R'])('reports a syntax error for %s', async (algorithm) => {
    const result = await verifyAlgorithm(sune, algorithm);
    expect(result).toMatchObject({ correct: false, syntaxValid: false, moveCount: 0 });
    expect(result.message).not.toBe('');
  });

  it('reports a move the 3x3x3 cube does not have', async () => {
    const result = await verifyAlgorithm(sune, 'R U Q');
    expect(result).toMatchObject({ correct: false, syntaxValid: false });
    expect(result.message).toContain('Q');
  });

  it.each(['', '   '])('asks for at least one move when the input is %j', async (algorithm) => {
    const result = await verifyAlgorithm(sune, algorithm);
    expect(result).toMatchObject({ correct: false, syntaxValid: false, message: 'Enter at least one move.' });
  });
});
