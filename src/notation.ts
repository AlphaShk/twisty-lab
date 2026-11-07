import { Alg, Move } from 'cubing/alg';

const ROTATIONS = new Set(['x', 'y', 'z']);

/** Pretty-prints notation with superscript 2 and a typographic prime. */
export const displayAlg = (algorithm: string) => algorithm.replaceAll('2', '²').replaceAll("'", '′');

/** Parses notation, returning null instead of throwing on syntax errors. */
export function parseAlg(text: string): Alg | null {
  try {
    return new Alg(text);
  } catch {
    return null;
  }
}

/** Flattens groupings, commutators and conjugates into a list of moves. */
export function movesOf(alg: Alg): Move[] {
  const moves: Move[] = [];
  for (const leaf of alg.experimentalExpand()) {
    const move = leaf.as(Move);
    if (move) moves.push(move);
  }
  return moves;
}

/** Number of moves, not counting whole-cube rotations (x, y, z). */
export function countMoves(alg: Alg) {
  return movesOf(alg).filter((move) => !ROTATIONS.has(move.family)).length;
}

export type Phrase = {
  /** Display text, e.g. "R U R′ U′". */
  label: string;
  /** Plain notation of the phrase. */
  moves: string;
  /** Plain notation of everything that comes before the phrase. */
  before: string;
};

/** Splits an algorithm into short phrases of `size` moves; [] if it does not parse. */
export function splitIntoPhrases(text: string, size = 4): Phrase[] {
  const alg = parseAlg(text);
  if (!alg) return [];
  const moves = movesOf(alg).map((move) => move.toString());
  const phrases: Phrase[] = [];
  for (let start = 0; start < moves.length; start += size) {
    const chunk = moves.slice(start, start + size).join(' ');
    phrases.push({ label: displayAlg(chunk), moves: chunk, before: moves.slice(0, start).join(' ') });
  }
  return phrases;
}
