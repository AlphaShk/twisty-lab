import { readFileSync } from 'node:fs';
import { cube3x3x3 } from 'cubing/puzzles';
import { beforeAll, describe, expect, it } from 'vitest';
import { KPattern, type KPuzzle } from 'cubing/kpuzzle';
import { ollCases } from './data';
import {
  lastLayerOrientation,
  ollCasePattern,
  orientationKey,
  renderOllSvg,
  type LastLayerOrientation,
} from './ollDiagram';

let kpuzzle: KPuzzle;
const states = new Map<number, LastLayerOrientation>();

beforeAll(async () => {
  kpuzzle = await cube3x3x3.kpuzzle();
  for (const item of ollCases)
    states.set(item.number, lastLayerOrientation(ollCasePattern(kpuzzle, item.algorithm)));
});

// Face cells of the four U-layer edges (back, left, right, front) and corners.
const EDGE_CELLS = [1, 3, 5, 7];
const CORNER_CELLS = [0, 2, 6, 8];
const count = (state: LastLayerOrientation, cells: number[]) =>
  cells.filter((cell) => state.face[cell]).length;

describe('OLL diagrams', () => {
  it('match the recognition-shape groups', () => {
    for (const item of ollCases) {
      const state = states.get(item.number)!;
      const edges = count(state, EDGE_CELLS);
      const corners = count(state, CORNER_CELLS);
      if (item.group === 'Dot') expect(edges, `OLL ${item.number}`).toBe(0);
      else if (item.group === 'Cross') expect(edges, `OLL ${item.number}`).toBe(4);
      else expect(edges, `OLL ${item.number}`).toBe(2);
      if (item.group === 'Corners Oriented') expect(corners, `OLL ${item.number}`).toBe(4);
    }
  });

  it('show each U sticker exactly once (on top or on one side)', () => {
    for (const state of states.values()) {
      const visible =
        state.face.filter(Boolean).length +
        Object.values(state.sides).flat().filter(Boolean).length;
      expect(visible).toBe(9);
    }
  });

  it('are 57 different cases up to a U turn, i.e. all of OLL', () => {
    // 3^3 * 2^3 = 216 last-layer orientation states fall into 58 classes under
    // U turns (Burnside), one of which is solved: 57 cases in total.
    const seen = new Map<string, number>();
    const solvedKey = orientationKey(lastLayerOrientation(kpuzzle.defaultPattern()));
    for (const item of ollCases) {
      const pattern = ollCasePattern(kpuzzle, item.algorithm);
      for (const auf of ['', 'U', 'U2', "U'"]) {
        const key = orientationKey(lastLayerOrientation(pattern.applyAlg(auf)));
        expect(key).not.toBe(solvedKey);
        const owner = seen.get(key);
        expect(
          owner === undefined || owner === item.number,
          `OLL ${item.number} looks like OLL ${owner}`,
        ).toBe(true);
        seen.set(key, item.number);
      }
    }
  });

  it('cover all 58 classes of last-layer orientations together with the solved state', () => {
    // Enumerate the 2^3 * 3^3 = 216 reachable orientation states of the four
    // U-layer edges (flips sum to 0 mod 2) and corners (twists sum to 0 mod 3).
    const solved = kpuzzle.defaultPattern();
    const classOf = (pattern: KPattern) =>
      ['', 'U', 'U2', "U'"]
        .map((auf) => orientationKey(lastLayerOrientation(pattern.applyAlg(auf))))
        .sort()[0];
    const digits = (value: number, base: number) =>
      Array.from({ length: 4 }, (_, index) => Math.floor(value / base ** index) % base);
    const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

    const classes = new Set<string>();
    let states = 0;
    for (let e = 0; e < 2 ** 4; e += 1) {
      for (let c = 0; c < 3 ** 4; c += 1) {
        const edges = digits(e, 2);
        const corners = digits(c, 3);
        if (sum(edges) % 2 || sum(corners) % 3) continue;
        const data = structuredClone(solved.patternData);
        data.EDGES.orientation.splice(0, 4, ...edges);
        data.CORNERS.orientation.splice(0, 4, ...corners);
        classes.add(classOf(new KPattern(kpuzzle, data)));
        states += 1;
      }
    }
    expect(states).toBe(216);
    expect(classes.size).toBe(58);

    const covered = new Set([
      classOf(solved),
      ...ollCases.map((item) => classOf(ollCasePattern(kpuzzle, item.algorithm))),
    ]);
    expect(covered).toEqual(classes);
  });

  it.each(ollCases.map((item) => [item.number]))('public/oll/%i.svg is up to date', (number) => {
    const file = readFileSync(new URL(`../public/oll/${number}.svg`, import.meta.url), 'utf8');
    expect(file).toBe(renderOllSvg(states.get(number)!, { title: `OLL ${number}` }));
  });
});
