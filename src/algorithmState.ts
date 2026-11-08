// Per-case algorithm choices, as pure state transitions.
//
// Invariant: a case's preferred algorithm is either built in (the curated
// default or a JPerm listing) or a custom algorithm that passed verification.

import type { OllCase } from './data';

export const DEFAULT_ID = 'default';

export type CustomAlgorithm = {
  id: string;
  label: string;
  algorithm: string;
  /** ISO time of the last successful verification of exactly this text, or null. */
  verifiedAt: string | null;
};

export type CaseAlgorithms = {
  preferredId: string;
  alternatives: CustomAlgorithm[];
};

export type AlgorithmMap = Record<number, CaseAlgorithms>;

export type BuiltInVariant = {
  source: 'default' | 'jperm';
  id: string;
  label: string;
  algorithm: string;
  /** JPerm listing number: the variant's own one, or the one the default matches. */
  listing: number | null;
};

export type AlgorithmVariant = BuiltInVariant | ({ source: 'custom' } & CustomAlgorithm);

export const isBuiltIn = (variant: AlgorithmVariant): variant is BuiltInVariant =>
  variant.source !== 'custom';

/** Built-in algorithms count as verified; the test suite checks every one of them. */
export const isVerified = (variant: AlgorithmVariant) =>
  isBuiltIn(variant) || variant.verifiedAt !== null;

export const emptyCaseAlgorithms = (): CaseAlgorithms => ({
  preferredId: DEFAULT_ID,
  alternatives: [],
});

export function initialAlgorithms(cases: OllCase[]): AlgorithmMap {
  return Object.fromEntries(cases.map(({ number }) => [number, emptyCaseAlgorithms()]));
}

export function variantsFor(item: OllCase, state: CaseAlgorithms): AlgorithmVariant[] {
  return [
    {
      source: 'default',
      id: DEFAULT_ID,
      label: 'Default',
      algorithm: item.algorithm,
      listing: item.defaultListing,
    },
    ...item.jpermAlternatives.map(({ listing, algorithm }): AlgorithmVariant => ({
      source: 'jperm',
      id: `jperm-${listing}`,
      label: `JPerm ${listing}`,
      algorithm,
      listing,
    })),
    ...state.alternatives.map((custom): AlgorithmVariant => ({ source: 'custom', ...custom })),
  ];
}

export function preferredVariant(item: OllCase, state: CaseAlgorithms): AlgorithmVariant {
  const variants = variantsFor(item, state);
  return variants.find((variant) => variant.id === state.preferredId) ?? variants[0];
}

/** Whether `preferredId` names a built-in variant or a verified custom one of this case. */
export function isValidPreferred(item: OllCase, state: CaseAlgorithms) {
  const variant = variantsFor(item, state).find(({ id }) => id === state.preferredId);
  return variant !== undefined && isVerified(variant);
}

/**
 * Whether the text in the editor is verified: built in, unchanged since a
 * successful verification, or just verified.
 */
export function isDraftVerified(
  variant: AlgorithmVariant | null,
  draft: string,
  justVerified: boolean,
) {
  if (justVerified) return true;
  if (!variant) return false;
  if (isBuiltIn(variant)) return true;
  return variant.verifiedAt !== null && draft.trim() === variant.algorithm;
}

export type SaveResult = {
  state: CaseAlgorithms;
  saved: CustomAlgorithm;
  /** True if the saved algorithm was preferred and lost that status because its text changed. */
  demoted: boolean;
};

/**
 * Adds or updates a custom algorithm. A changed text drops the verification
 * unless `verifiedAt` is given; a preferred algorithm that is no longer
 * verified hands the preferred slot back to the default.
 */
export function saveCustom(
  state: CaseAlgorithms,
  input: { id: string; label: string; algorithm: string },
  verifiedAt?: string,
): SaveResult {
  const existing = state.alternatives.find(({ id }) => id === input.id);
  const saved: CustomAlgorithm = {
    id: input.id,
    label: input.label.trim() || 'My algorithm',
    algorithm: input.algorithm.trim(),
    verifiedAt:
      verifiedAt ?? (existing?.algorithm === input.algorithm.trim() ? existing.verifiedAt : null),
  };
  const alternatives = existing
    ? state.alternatives.map((custom) => (custom.id === saved.id ? saved : custom))
    : [...state.alternatives, saved];
  const demoted = state.preferredId === saved.id && saved.verifiedAt === null;
  return {
    state: { preferredId: demoted ? DEFAULT_ID : state.preferredId, alternatives },
    saved,
    demoted,
  };
}

/** Makes a variant preferred; null if it is a custom algorithm that is not verified. */
export function makePreferred(
  item: OllCase,
  state: CaseAlgorithms,
  id: string,
): CaseAlgorithms | null {
  const variant = variantsFor(item, state).find((candidate) => candidate.id === id);
  if (!variant || !isVerified(variant)) return null;
  return { ...state, preferredId: id };
}

export function deleteCustom(state: CaseAlgorithms, id: string): CaseAlgorithms {
  return {
    preferredId: state.preferredId === id ? DEFAULT_ID : state.preferredId,
    alternatives: state.alternatives.filter((custom) => custom.id !== id),
  };
}

const isCustomAlgorithm = (value: unknown): value is CustomAlgorithm => {
  const custom = value as Partial<CustomAlgorithm> | null;
  return (
    typeof custom?.id === 'string' &&
    typeof custom.label === 'string' &&
    typeof custom.algorithm === 'string' &&
    (custom.verifiedAt === null || typeof custom.verifiedAt === 'string')
  );
};

/**
 * Rebuilds the map from stored JSON. Malformed entries are dropped, and a
 * preferred id that breaks the invariant falls back to the default.
 */
export function restoreAlgorithms(cases: OllCase[], stored: unknown): AlgorithmMap {
  const storedMap = (stored ?? {}) as Record<string, Partial<CaseAlgorithms> | undefined>;
  return Object.fromEntries(
    cases.map((item) => {
      const entry = storedMap[item.number];
      const state: CaseAlgorithms = {
        preferredId: typeof entry?.preferredId === 'string' ? entry.preferredId : DEFAULT_ID,
        alternatives: Array.isArray(entry?.alternatives)
          ? entry.alternatives.filter(isCustomAlgorithm)
          : [],
      };
      return [
        item.number,
        isValidPreferred(item, state) ? state : { ...state, preferredId: DEFAULT_ID },
      ];
    }),
  );
}
