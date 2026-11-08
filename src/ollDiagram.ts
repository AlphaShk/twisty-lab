// Top-view ("plan") diagrams of OLL cases, computed from the cube model.
//
// A case is rebuilt by applying the inverse of its reference algorithm to a
// solved cube. The last-layer orientation is then read straight from the
// cubing.js KPuzzle pattern. In that model a piece's U sticker sits on facelet
// `orientation` of the position it occupies, and facelets are numbered
// clockwise starting at the U face (for example UFR = U, R, F).
//
// This module has no relative imports so that the image generator script can
// load it directly with Node's TypeScript type stripping.

import { Alg } from 'cubing/alg';
import type { KPattern, KPuzzle } from 'cubing/kpuzzle';

export type Side = 'back' | 'right' | 'front' | 'left';

export type LastLayerOrientation = {
  /** U face as seen from above, row-major, back row first. `true` = U-coloured sticker. */
  face: boolean[];
  /** Side stickers of the last layer. Back/front run left to right, left/right run back to front. */
  sides: Record<Side, boolean[]>;
};

// Position indices in the cubing.js 3x3x3 definition.
const EDGE = { UF: 0, UR: 1, UB: 2, UL: 3 } as const;
const CORNER = { UFR: 0, URB: 1, UBL: 2, ULF: 3 } as const;

type Facelet = { orbit: 'EDGES' | 'CORNERS'; position: number; facelet: number };

// Where each U-layer facelet appears in the top view.
const FACE_CELLS: Array<Facelet | 'center'> = [
  { orbit: 'CORNERS', position: CORNER.UBL, facelet: 0 },
  { orbit: 'EDGES', position: EDGE.UB, facelet: 0 },
  { orbit: 'CORNERS', position: CORNER.URB, facelet: 0 },
  { orbit: 'EDGES', position: EDGE.UL, facelet: 0 },
  'center',
  { orbit: 'EDGES', position: EDGE.UR, facelet: 0 },
  { orbit: 'CORNERS', position: CORNER.ULF, facelet: 0 },
  { orbit: 'EDGES', position: EDGE.UF, facelet: 0 },
  { orbit: 'CORNERS', position: CORNER.UFR, facelet: 0 },
];

const SIDE_CELLS: Record<Side, Facelet[]> = {
  back: [
    { orbit: 'CORNERS', position: CORNER.UBL, facelet: 2 },
    { orbit: 'EDGES', position: EDGE.UB, facelet: 1 },
    { orbit: 'CORNERS', position: CORNER.URB, facelet: 1 },
  ],
  right: [
    { orbit: 'CORNERS', position: CORNER.URB, facelet: 2 },
    { orbit: 'EDGES', position: EDGE.UR, facelet: 1 },
    { orbit: 'CORNERS', position: CORNER.UFR, facelet: 1 },
  ],
  front: [
    { orbit: 'CORNERS', position: CORNER.ULF, facelet: 1 },
    { orbit: 'EDGES', position: EDGE.UF, facelet: 1 },
    { orbit: 'CORNERS', position: CORNER.UFR, facelet: 2 },
  ],
  left: [
    { orbit: 'CORNERS', position: CORNER.UBL, facelet: 1 },
    { orbit: 'EDGES', position: EDGE.UL, facelet: 1 },
    { orbit: 'CORNERS', position: CORNER.ULF, facelet: 2 },
  ],
};

const SIDES: Side[] = ['back', 'right', 'front', 'left'];

function orbitData(pattern: KPattern, orbit: 'EDGES' | 'CORNERS' | 'CENTERS') {
  const data = pattern.patternData[orbit];
  if (!data) throw new Error(`The pattern has no ${orbit} orbit.`);
  return data;
}

/**
 * Throws unless the pattern is a last-layer case: centres and the first two
 * layers solved, and the four U-layer edges and corners somewhere in the U layer.
 */
export function assertLastLayerCase(pattern: KPattern) {
  const centers = orbitData(pattern, 'CENTERS');
  if (centers.pieces.some((piece, index) => piece !== index)) {
    throw new Error('The centres are not in their home positions.');
  }
  for (const [orbit, count] of [
    ['EDGES', 12],
    ['CORNERS', 8],
  ] as const) {
    const { pieces, orientation } = orbitData(pattern, orbit);
    for (let position = 0; position < count; position += 1) {
      const inLastLayer = position < 4;
      if (inLastLayer && pieces[position] >= 4) {
        throw new Error(`An F2L piece sits in the last layer (${orbit} ${position}).`);
      }
      if (!inLastLayer && (pieces[position] !== position || orientation[position] !== 0)) {
        throw new Error(`F2L is not solved (${orbit} ${position}).`);
      }
    }
  }
}

/** Reads the last-layer orientation of a pattern produced by `ollCasePattern`. */
export function lastLayerOrientation(pattern: KPattern): LastLayerOrientation {
  assertLastLayerCase(pattern);
  const shows = (cell: Facelet) =>
    orbitData(pattern, cell.orbit).orientation[cell.position] === cell.facelet;
  return {
    face: FACE_CELLS.map((cell) => cell === 'center' || shows(cell)),
    sides: Object.fromEntries(SIDES.map((side) => [side, SIDE_CELLS[side].map(shows)])) as Record<
      Side,
      boolean[]
    >,
  };
}

/** The case solved by `algorithm`: the inverse of the algorithm applied to a solved cube. */
export function ollCasePattern(kpuzzle: KPuzzle, algorithm: string): KPattern {
  return kpuzzle.defaultPattern().applyAlg(new Alg(algorithm).invert());
}

/** Compact signature, e.g. for comparing cases: face cells, then the side strips. */
export function orientationKey(state: LastLayerOrientation) {
  const bits = (values: boolean[]) => values.map((value) => (value ? '1' : '0')).join('');
  return [bits(state.face), ...SIDES.map((side) => bits(state.sides[side]))].join('|');
}

const COLORS = {
  body: '#1b2621',
  top: '#e9c747',
  topEdge: '#b8961f',
  off: '#4b5752',
  sideOff: '#d4dad5',
};

const round = (value: number) => Number(value.toFixed(2));

type RenderOptions = {
  /** Accessible title embedded in the SVG. */
  title?: string;
  /** Edge length of the square output in px. */
  size?: number;
};

/** SVG shapes of the diagram in a 100 x 100 coordinate system. */
export function ollDiagramShapes(state: LastLayerOrientation): string[] {
  const view = 100;
  const strip = 6.5;
  const gap = 2.5;
  const faceStart = strip + gap + 1;
  const faceSize = view - 2 * faceStart;
  const pad = 2.6;
  const inner = 2.2;
  const cell = (faceSize - 2 * pad - 2 * inner) / 3;
  const stripLength = cell - 2;
  const offset = (index: number) => faceStart + pad + index * (cell + inner);

  const parts: string[] = [];
  parts.push(
    `<rect x="${round(faceStart)}" y="${round(faceStart)}" width="${round(faceSize)}" height="${round(faceSize)}" rx="7" fill="${COLORS.body}"/>`,
  );

  state.face.forEach((isTop, index) => {
    const x = offset(index % 3);
    const y = offset(Math.floor(index / 3));
    const fill = isTop ? COLORS.top : COLORS.off;
    parts.push(
      `<rect x="${round(x)}" y="${round(y)}" width="${round(cell)}" height="${round(cell)}" rx="3" fill="${fill}"/>`,
    );
  });

  const stripRect = (side: Side, index: number) => {
    const along = offset(index) + 1;
    const near = 1;
    const far = view - 1 - strip;
    switch (side) {
      case 'back':
        return { x: along, y: near, width: stripLength, height: strip };
      case 'front':
        return { x: along, y: far, width: stripLength, height: strip };
      case 'left':
        return { x: near, y: along, width: strip, height: stripLength };
      case 'right':
        return { x: far, y: along, width: strip, height: stripLength };
    }
  };

  for (const side of SIDES) {
    state.sides[side].forEach((isTop, index) => {
      const { x, y, width, height } = stripRect(side, index);
      const paint = isTop
        ? `fill="${COLORS.top}" stroke="${COLORS.topEdge}" stroke-width="0.8"`
        : `fill="${COLORS.sideOff}"`;
      parts.push(
        `<rect x="${round(x)}" y="${round(y)}" width="${round(width)}" height="${round(height)}" rx="2" ${paint}/>`,
      );
    });
  }

  return parts;
}

/** Deterministic SVG markup for a last-layer orientation diagram. */
export function renderOllSvg(state: LastLayerOrientation, options: RenderOptions = {}) {
  const size = options.size ?? 120;
  const lines = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100" role="img">`,
    ...(options.title ? [`<title>${options.title.replace(/[<&>]/g, '')}</title>`] : []),
    ...ollDiagramShapes(state),
    '</svg>',
  ];
  return `${lines.join('\n')}\n`;
}
