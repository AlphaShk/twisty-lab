import { Alg } from 'cubing/alg';
import type { KPattern } from 'cubing/kpuzzle';
import { cube3x3x3 } from 'cubing/puzzles';
import { countMoves, movesOf } from './notation';

/** U turns tried before the candidate, so an algorithm that assumes another AUF still passes. */
export const PRE_AUFS = ['', 'U', "U'", 'U2'] as const;
export type PreAuf = (typeof PRE_AUFS)[number];

export type VerificationResult = {
  correct: boolean;
  syntaxValid: boolean;
  ollSolved: boolean;
  f2lPreserved: boolean;
  /** The U turn the algorithm needs first ('' if none). Only set when correct. */
  preAuf: PreAuf;
  /** The parsed notation, with `preAuf` in front when one is needed. */
  normalized: string;
  moveCount: number;
  message: string;
  /** The parser's own error text, for syntax errors. */
  detail?: string;
};

type CubeContext = {
  solved: KPattern;
  orientations: string[];
};

let contextPromise: Promise<CubeContext> | null = null;

function patternSignature(pattern: KPattern) {
  const centers = pattern.patternData.CENTERS;
  return centers ? centers.pieces.join(',') : '';
}

async function getCubeContext(): Promise<CubeContext> {
  if (contextPromise) return contextPromise;
  contextPromise = (async () => {
    const kpuzzle = await cube3x3x3.kpuzzle();
    const solved = kpuzzle.defaultPattern();
    const orientations: string[] = [];
    const pending = [''];
    const seen = new Set<string>();

    while (pending.length) {
      const alg = pending.shift()!;
      const signature = patternSignature(solved.applyAlg(alg));
      if (seen.has(signature)) continue;
      seen.add(signature);
      orientations.push(alg);
      for (const move of ['x', 'y', 'z']) pending.push(`${alg} ${move}`.trim());
    }

    return { solved, orientations };
  })();
  return contextPromise;
}

function assessPattern(pattern: KPattern, solved: KPattern) {
  const finalEdges = pattern.patternData.EDGES;
  const finalCorners = pattern.patternData.CORNERS;
  const finalCenters = pattern.patternData.CENTERS;
  const solvedEdges = solved.patternData.EDGES;
  const solvedCorners = solved.patternData.CORNERS;
  const solvedCenters = solved.patternData.CENTERS;

  if (
    !finalEdges ||
    !finalCorners ||
    !finalCenters ||
    !solvedEdges ||
    !solvedCorners ||
    !solvedCenters
  ) {
    return { ollSolved: false, f2lPreserved: false, centersAligned: false };
  }

  const centersAligned = finalCenters.pieces.every(
    (piece, index) => piece === solvedCenters.pieces[index],
  );
  const ollSolved =
    finalEdges.orientation.slice(0, 4).every((value) => value === 0) &&
    finalCorners.orientation.slice(0, 4).every((value) => value === 0);
  const f2lEdgesSolved =
    finalEdges.pieces.slice(4).every((piece, offset) => piece === solvedEdges.pieces[offset + 4]) &&
    finalEdges.orientation.slice(4).every((value) => value === 0);
  const f2lCornersSolved =
    finalCorners.pieces
      .slice(4)
      .every((piece, offset) => piece === solvedCorners.pieces[offset + 4]) &&
    finalCorners.orientation.slice(4).every((value) => value === 0);

  return {
    ollSolved,
    f2lPreserved: f2lEdgesSolved && f2lCornersSolved,
    centersAligned,
  };
}

export function invertAlgorithm(algorithm: string) {
  return new Alg(algorithm).invert().toString();
}

/** True if the notation parses and every move exists on a 3x3x3 cube. */
export async function isPlayable(algorithm: string) {
  try {
    const { solved } = await getCubeContext();
    solved.applyAlg(new Alg(algorithm));
    return true;
  } catch {
    return false;
  }
}

const rawMessage = (error: unknown) =>
  error instanceof Error ? error.message.replace(/^Error:\s*/, '') : String(error);

const count = (text: string, char: string) => text.split(char).length - 1;

/** Turns a cubing.js parser error into a sentence a cuber can act on. */
export function describeSyntaxError(text: string, raw: string) {
  if (count(text, '(') !== count(text, ')') || count(text, '[') !== count(text, ']')) {
    return 'Syntax error: unbalanced brackets. Every "(" needs a ")" and every "[" needs a "]".';
  }
  const character = /Unexpected character: (.)/.exec(raw)?.[1];
  if (character) return `Syntax error: unexpected "${character}".`;
  return 'Syntax error: this is not valid cube notation.';
}

const rejected = (normalized: string, message: string, detail?: string): VerificationResult => ({
  correct: false,
  syntaxValid: false,
  ollSolved: false,
  f2lPreserved: false,
  preAuf: '',
  normalized,
  moveCount: 0,
  message,
  ...(detail ? { detail } : {}),
});

/**
 * Checks whether `candidateAlgorithm` solves the OLL case that
 * `referenceAlgorithm` solves: every last-layer piece oriented and F2L intact,
 * in any whole-cube orientation, after at most one U turn first.
 */
export async function verifyAlgorithm(
  referenceAlgorithm: string,
  candidateAlgorithm: string,
): Promise<VerificationResult> {
  let candidate: Alg;
  try {
    candidate = new Alg(candidateAlgorithm);
  } catch (error) {
    const raw = rawMessage(error);
    return rejected(candidateAlgorithm.trim(), describeSyntaxError(candidateAlgorithm, raw), raw);
  }

  const normalized = candidate.toString();
  if (!normalized.trim()) return rejected(normalized, 'Enter at least one move.');

  const { solved, orientations } = await getCubeContext();
  const unknownMove = movesOf(candidate).find((move) => {
    try {
      solved.applyMove(move);
      return false;
    } catch {
      return true;
    }
  });
  if (unknownMove) {
    return rejected(normalized, `${unknownMove.toString()} is not a move on a 3x3x3 cube.`);
  }

  const casePattern = solved.applyAlg(new Alg(referenceAlgorithm).invert());
  let sawOriented = false;
  let sawF2L = false;

  for (const preAuf of PRE_AUFS) {
    const finalPattern = casePattern.applyAlg(preAuf).applyAlg(candidate);
    for (const orientation of orientations) {
      const assessment = assessPattern(finalPattern.applyAlg(orientation), solved);
      if (!assessment.centersAligned) continue;
      sawOriented ||= assessment.ollSolved;
      sawF2L ||= assessment.f2lPreserved;
      if (assessment.ollSolved && assessment.f2lPreserved) {
        return {
          correct: true,
          syntaxValid: true,
          ollSolved: true,
          f2lPreserved: true,
          preAuf,
          normalized: preAuf ? `${preAuf} ${normalized}` : normalized,
          moveCount: countMoves(candidate),
          message: preAuf
            ? `Correct with ${preAuf} first. OLL is solved and F2L stays intact.`
            : 'Correct for this case. OLL is solved and F2L stays intact.',
        };
      }
    }
  }

  const message =
    !sawF2L && !sawOriented
      ? 'This changes an F2L piece and leaves OLL unoriented.'
      : !sawF2L
        ? 'OLL is oriented, but the algorithm changes an F2L piece.'
        : 'F2L stays intact, but at least one top sticker remains unoriented.';

  return {
    correct: false,
    syntaxValid: true,
    ollSolved: sawOriented,
    f2lPreserved: sawF2L,
    preAuf: '',
    normalized,
    moveCount: countMoves(candidate),
    message,
  };
}
