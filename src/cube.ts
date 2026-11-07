import { Alg } from 'cubing/alg';
import type { KPattern, KPuzzle } from 'cubing/kpuzzle';
import { cube3x3x3 } from 'cubing/puzzles';
import { countMoves } from './notation';

export type VerificationResult = {
  correct: boolean;
  syntaxValid: boolean;
  ollSolved: boolean;
  f2lPreserved: boolean;
  normalized: string;
  moveCount: number;
  message: string;
};

type CubeContext = {
  kpuzzle: KPuzzle;
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

    return { kpuzzle, solved, orientations };
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

  if (!finalEdges || !finalCorners || !finalCenters || !solvedEdges || !solvedCorners || !solvedCenters) {
    return { ollSolved: false, f2lPreserved: false, centersAligned: false };
  }

  const centersAligned = finalCenters.pieces.every((piece, index) => piece === solvedCenters.pieces[index]);
  const ollSolved = finalEdges.orientation.slice(0, 4).every((value) => value === 0)
    && finalCorners.orientation.slice(0, 4).every((value) => value === 0);
  const f2lEdgesSolved = finalEdges.pieces.slice(4).every((piece, offset) => piece === solvedEdges.pieces[offset + 4])
    && finalEdges.orientation.slice(4).every((value) => value === 0);
  const f2lCornersSolved = finalCorners.pieces.slice(4).every((piece, offset) => piece === solvedCorners.pieces[offset + 4])
    && finalCorners.orientation.slice(4).every((value) => value === 0);

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

export async function verifyAlgorithm(officialAlgorithm: string, candidateAlgorithm: string): Promise<VerificationResult> {
  let candidate: Alg;
  try {
    candidate = new Alg(candidateAlgorithm);
  } catch (error) {
    return {
      correct: false,
      syntaxValid: false,
      ollSolved: false,
      f2lPreserved: false,
      normalized: candidateAlgorithm.trim(),
      moveCount: 0,
      message: error instanceof Error ? error.message.replace(/^Error:\s*/, '') : 'The notation could not be parsed.',
    };
  }

  const normalized = candidate.toString();
  if (!normalized.trim()) {
    return {
      correct: false,
      syntaxValid: false,
      ollSolved: false,
      f2lPreserved: false,
      normalized,
      moveCount: 0,
      message: 'Enter at least one move.',
    };
  }

  try {
    const { kpuzzle, solved, orientations } = await getCubeContext();
    const setup = new Alg(officialAlgorithm).invert();
    const casePattern = solved.applyAlg(setup);
    const finalPattern = casePattern.applyAlg(candidate);
    let sawOriented = false;
    let sawF2L = false;

    for (const orientation of orientations) {
      const aligned = finalPattern.applyAlg(orientation);
      const assessment = assessPattern(aligned, solved);
      if (!assessment.centersAligned) continue;
      sawOriented ||= assessment.ollSolved;
      sawF2L ||= assessment.f2lPreserved;
      if (assessment.ollSolved && assessment.f2lPreserved) {
        return {
          correct: true,
          syntaxValid: true,
          ollSolved: true,
          f2lPreserved: true,
          normalized,
          moveCount: countMoves(candidate),
          message: 'Correct for this case. OLL is solved and F2L stays intact.',
        };
      }
    }

    const message = !sawF2L && !sawOriented
      ? 'This changes an F2L piece and leaves OLL unoriented.'
      : !sawF2L
        ? 'OLL is oriented, but the algorithm changes an F2L piece.'
        : 'F2L stays intact, but at least one top sticker remains unoriented.';

    return {
      correct: false,
      syntaxValid: true,
      ollSolved: sawOriented,
      f2lPreserved: sawF2L,
      normalized,
      moveCount: countMoves(candidate),
      message,
    };
  } catch (error) {
    return {
      correct: false,
      syntaxValid: false,
      ollSolved: false,
      f2lPreserved: false,
      normalized,
      moveCount: 0,
      message: error instanceof Error ? error.message.replace(/^Error:\s*/, '') : 'The cube simulator could not apply this notation.',
    };
  }
}
