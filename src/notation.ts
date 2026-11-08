import { Alg, Move } from 'cubing/alg';

const ROTATIONS = new Set(['x', 'y', 'z']);

const isRotation = (move: Move) => ROTATIONS.has(move.family);

/** Pretty-prints notation with superscript 2 and a typographic prime. */
export const displayAlg = (algorithm: string) =>
  algorithm.replaceAll('2', '²').replaceAll("'", '′');

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
  return movesOf(alg).filter((move) => !isRotation(move)).length;
}

const quarterTurns = (amount: number) => ((amount % 4) + 4) % 4;

const turnSuffix = ['', '', '2', "'"];

const ROTATION_TOKEN = /^([xyz])(2?)('?)$/;

/**
 * Puts a whole-cube rotation in front of an algorithm. If the algorithm already
 * starts with a rotation about the same axis, the two are merged, so
 * `y` + `y R U` gives `y2 R U` and `y'` + `y R U` gives `R U`.
 */
export function prependRotation(rotation: string, algorithm: string) {
  const parse = (token: string) => {
    const match = ROTATION_TOKEN.exec(token);
    if (!match) return null;
    return { axis: match[1], amount: (match[2] ? 2 : 1) * (match[3] ? -1 : 1) };
  };
  const added = parse(rotation.trim());
  if (!added) throw new Error(`Not a whole-cube rotation: ${rotation}`);
  const [first = '', ...rest] = algorithm.trim().split(/\s+/);
  const leading = parse(first);
  if (!leading || leading.axis !== added.axis) return `${rotation.trim()} ${algorithm.trim()}`;
  const turns = quarterTurns(added.amount + leading.amount);
  const merged = turns === 0 ? [] : [`${added.axis}${turnSuffix[turns]}`];
  return [...merged, ...rest].join(' ');
}

/**
 * Key for spotting duplicate algorithms: the flattened moves with leading
 * rotations dropped and consecutive turns of the same layer merged, so
 * `y y R U2' R' R'` and `R U2 R2` get the same key.
 */
export function moveSequenceKey(text: string) {
  const alg = parseAlg(text);
  if (!alg) return text.trim();
  const merged: Array<{ layer: string; turns: number }> = [];
  for (const move of movesOf(alg)) {
    if (merged.length === 0 && isRotation(move)) continue;
    const layer = move.quantum.toString();
    const last = merged.at(-1);
    if (last?.layer === layer) {
      last.turns = quarterTurns(last.turns + move.amount);
      if (last.turns === 0) merged.pop();
    } else {
      merged.push({ layer, turns: quarterTurns(move.amount) });
    }
  }
  return merged.map(({ layer, turns }) => `${layer}${turnSuffix[turns]}`).join(' ');
}

/** True if the notation starts with two whole-cube rotations in a row. */
export function startsWithStackedRotations(text: string) {
  const alg = parseAlg(text);
  if (!alg) return false;
  const [first, second] = movesOf(alg);
  return Boolean(first && second && isRotation(first) && isRotation(second));
}

export type Phrase = {
  /** Display text, e.g. "R U R′ U′". */
  label: string;
  /** Plain notation of the phrase. */
  moves: string;
  /** Plain notation of everything that comes before the phrase. */
  before: string;
};

/**
 * Splits an algorithm into phrases of `size` moves; [] if it does not parse.
 * Whole-cube rotations do not count towards the size, matching `countMoves`:
 * a rotation joins the phrase of the move that follows it, and trailing
 * rotations join the last phrase.
 */
export function splitIntoPhrases(text: string, size = 4): Phrase[] {
  const alg = parseAlg(text);
  if (!alg) return [];
  const chunks: string[][] = [];
  let current: string[] = [];
  let turns = 0;
  for (const move of movesOf(alg)) {
    if (turns === size) {
      chunks.push(current);
      current = [];
      turns = 0;
    }
    current.push(move.toString());
    if (!isRotation(move)) turns += 1;
  }
  if (turns === 0 && chunks.length) chunks[chunks.length - 1].push(...current);
  else if (current.length) chunks.push(current);

  const phrases: Phrase[] = [];
  const done: string[] = [];
  for (const chunk of chunks) {
    const moves = chunk.join(' ');
    phrases.push({ label: displayAlg(moves), moves, before: done.join(' ') });
    done.push(...chunk);
  }
  return phrases;
}
