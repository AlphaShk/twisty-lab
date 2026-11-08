import type { OllCase } from './data';

export type LearningStatus = 'unlearned' | 'learning' | 'learned';

export const LEARNING_STATUSES: LearningStatus[] = ['unlearned', 'learning', 'learned'];

export const statusLabel: Record<LearningStatus, string> = {
  unlearned: 'Unlearned',
  learning: 'Learning',
  learned: 'Learned',
};

export type CaseProgress = {
  note: string;
  bookmarked: boolean;
  visited: boolean;
  status: LearningStatus;
};

export type ProgressMap = Record<number, CaseProgress>;

const emptyProgress = (): CaseProgress => ({
  note: '',
  bookmarked: false,
  visited: false,
  status: 'unlearned',
});

export function initialProgress(cases: OllCase[]): ProgressMap {
  return Object.fromEntries(cases.map(({ number }) => [number, emptyProgress()]));
}

/** Rebuilds the progress map from stored JSON, filling in missing cases and fields. */
export function restoreProgress(cases: OllCase[], stored: unknown): ProgressMap {
  const storedMap = (stored ?? {}) as Record<string, Partial<CaseProgress> | undefined>;
  return Object.fromEntries(
    cases.map(({ number }) => [number, { ...emptyProgress(), ...storedMap[number] }]),
  );
}

export const pluralize = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? '' : 's'}`;
