import { jpermAlgorithms, jpermAlignment, preferredAlgorithms } from './algorithms';

export type OllCase = {
  number: number;
  group: string;
  algorithm: string;
  websiteAlgorithms: string[];
  cue: string;
  hint: string;
  image: string;
};

// Case number and JPerm's recognition-shape group for each OLL case.
const source: Array<[number, string]> = [
  [1, 'Dot'],
  [2, 'Dot'],
  [3, 'Dot'],
  [4, 'Dot'],
  [5, 'Square Shape'],
  [6, 'Square Shape'],
  [7, 'Small Lightning Bolt'],
  [8, 'Small Lightning Bolt'],
  [9, 'Fish Shape'],
  [10, 'Fish Shape'],
  [11, 'Small Lightning Bolt'],
  [12, 'Small Lightning Bolt'],
  [13, 'Knight Move Shape'],
  [14, 'Knight Move Shape'],
  [15, 'Knight Move Shape'],
  [16, 'Knight Move Shape'],
  [17, 'Dot'],
  [18, 'Dot'],
  [19, 'Dot'],
  [20, 'Dot'],
  [21, 'Cross'],
  [22, 'Cross'],
  [23, 'Cross'],
  [24, 'Cross'],
  [25, 'Cross'],
  [26, 'Cross'],
  [27, 'Cross'],
  [28, 'Corners Oriented'],
  [29, 'Awkward Shape'],
  [30, 'Awkward Shape'],
  [31, 'P Shape'],
  [32, 'P Shape'],
  [33, 'T Shape'],
  [34, 'C Shape'],
  [35, 'Fish Shape'],
  [36, 'W Shape'],
  [37, 'Fish Shape'],
  [38, 'W Shape'],
  [39, 'Big Lightning Bolt'],
  [40, 'Big Lightning Bolt'],
  [41, 'Awkward Shape'],
  [42, 'Awkward Shape'],
  [43, 'P Shape'],
  [44, 'P Shape'],
  [45, 'T Shape'],
  [46, 'C Shape'],
  [47, 'Small L Shape'],
  [48, 'Small L Shape'],
  [49, 'Small L Shape'],
  [50, 'Small L Shape'],
  [51, 'I Shape'],
  [52, 'I Shape'],
  [53, 'Small L Shape'],
  [54, 'Small L Shape'],
  [55, 'I Shape'],
  [56, 'I Shape'],
  [57, 'Corners Oriented'],
];

const cueByNumber: Record<number, string> = {
  1: 'A clean dot with no oriented edge',
  5: 'A compact yellow square in the back-left',
  6: 'A compact yellow square in the back-right',
  7: 'A small lightning bolt leaning right',
  8: 'A small lightning bolt leaning left',
  21: 'Double headlights',
  22: 'Wide headlights',
  23: 'A pair of headlights with a solved bar',
  24: 'Two adjacent yellow corners',
  25: 'The yellow bow tie',
  26: 'Anti-Sune',
  27: 'Sune',
  28: 'All corners are already oriented',
  33: 'A strong yellow T',
  44: 'A P facing right',
  45: 'A clean yellow T',
};

const groupHint: Record<string, string> = {
  'Dot': 'Find the empty yellow center pattern first, then use the side stickers to separate similar cases.',
  'Cross': 'The cross is solved; read the direction of the four yellow corners around it.',
  'Fish Shape': 'Anchor on the single yellow corner, then check which side has the paired stickers.',
  'P Shape': 'Hold the vertical stem at the back and check whether the block opens left or right.',
  'Small L Shape': 'Find the small yellow L and use the nearest side bar to choose the case.',
  'Small Lightning Bolt': 'Trace the short zig-zag, then check its mirror direction.',
};

const comparableAlgorithm = (algorithm: string) => algorithm
  .replaceAll("2'", '2')
  .replace(/[()]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

export const ollCases: OllCase[] = source.map(([number, group]) => ({
  number,
  group,
  algorithm: preferredAlgorithms[number],
  websiteAlgorithms: (jpermAlgorithms[number] ?? [])
    .map((algorithm, index) => {
      const alignment = jpermAlignment[`${number}-${index + 1}`];
      return alignment ? `${alignment} ${algorithm}` : algorithm;
    })
    .filter((algorithm) => comparableAlgorithm(algorithm) !== comparableAlgorithm(preferredAlgorithms[number])),
  image: `./oll/${number}.svg`,
  cue: cueByNumber[number] ?? `${group} · case ${number}`,
  hint: groupHint[group] ?? `Match the ${group.toLowerCase()} silhouette, then confirm with one side face.`,
}));

export const groups = [...new Set(ollCases.map((item) => item.group))];
