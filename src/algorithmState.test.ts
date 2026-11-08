import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ID,
  deleteCustom,
  emptyCaseAlgorithms,
  isDraftVerified,
  isValidPreferred,
  makePreferred,
  preferredVariant,
  restoreAlgorithms,
  saveCustom,
  variantsFor,
  type CaseAlgorithms,
} from './algorithmState';
import { ollCases } from './data';

const sune = ollCases.find((item) => item.number === 27)!;
const VERIFIED_AT = '2026-01-01T00:00:00.000Z';
const ANTI_SUNE_ANGLE = "y' R' U2 R U R' U R";

function withVerifiedCustom(): CaseAlgorithms {
  return saveCustom(
    emptyCaseAlgorithms(),
    { id: 'alt-1', label: 'Mine', algorithm: ANTI_SUNE_ANGLE },
    VERIFIED_AT,
  ).state;
}

describe('algorithm state', () => {
  it('lists the default, the distinct JPerm listings and the custom algorithms', () => {
    const variants = variantsFor(sune, withVerifiedCustom());
    expect(variants.map(({ id, label }) => [id, label])).toEqual([
      ['default', 'Default'],
      ['jperm-2', 'JPerm 2'],
      ['alt-1', 'Mine'],
    ]);
  });

  it('only lets a verified custom algorithm become preferred', () => {
    const unverified = saveCustom(emptyCaseAlgorithms(), {
      id: 'alt-1',
      label: 'Mine',
      algorithm: "R U R' D",
    }).state;
    expect(makePreferred(sune, unverified, 'alt-1')).toBeNull();
    expect(makePreferred(sune, withVerifiedCustom(), 'alt-1')?.preferredId).toBe('alt-1');
    expect(makePreferred(sune, withVerifiedCustom(), 'jperm-2')?.preferredId).toBe('jperm-2');
    expect(makePreferred(sune, withVerifiedCustom(), 'jperm-1')).toBeNull();
  });

  it('hands the preferred slot back to the default when a preferred algorithm is edited', () => {
    // Verify, make preferred, change the text to something wrong, save.
    const preferred = makePreferred(sune, withVerifiedCustom(), 'alt-1')!;
    const result = saveCustom(preferred, { id: 'alt-1', label: 'Mine', algorithm: "R U R' D" });
    expect(result.demoted).toBe(true);
    expect(result.saved.verifiedAt).toBeNull();
    expect(result.state.preferredId).toBe(DEFAULT_ID);
    expect(preferredVariant(sune, result.state).algorithm).toBe(sune.algorithm);
  });

  it('keeps the verification and the preferred slot when only the name changes', () => {
    const preferred = makePreferred(sune, withVerifiedCustom(), 'alt-1')!;
    const result = saveCustom(preferred, {
      id: 'alt-1',
      label: 'Renamed',
      algorithm: ANTI_SUNE_ANGLE,
    });
    expect(result).toMatchObject({
      demoted: false,
      saved: { label: 'Renamed', verifiedAt: VERIFIED_AT },
      state: { preferredId: 'alt-1' },
    });
  });

  it('counts the editor text as verified only while it matches the verified text', () => {
    const custom = variantsFor(sune, withVerifiedCustom()).find(({ id }) => id === 'alt-1')!;
    expect(isDraftVerified(custom, ` ${ANTI_SUNE_ANGLE} `, false)).toBe(true);
    expect(isDraftVerified(custom, "R U R' D", false)).toBe(false);
    expect(isDraftVerified(custom, "R U R' D", true)).toBe(true);
    expect(isDraftVerified(null, ANTI_SUNE_ANGLE, false)).toBe(false);
    expect(isDraftVerified(variantsFor(sune, emptyCaseAlgorithms())[0], '', false)).toBe(true);
  });

  it('falls back to the default when the preferred custom algorithm is deleted', () => {
    const preferred = makePreferred(sune, withVerifiedCustom(), 'alt-1')!;
    expect(deleteCustom(preferred, 'alt-1')).toEqual(emptyCaseAlgorithms());
  });

  it('repairs stored data that breaks the invariant', () => {
    const restored = restoreAlgorithms(ollCases, {
      27: {
        preferredId: 'alt-1',
        alternatives: [{ id: 'alt-1', label: 'Mine', algorithm: "R U R' D", verifiedAt: null }],
      },
      // JPerm listing 2 of OLL 21 is hidden as a copy of the default.
      21: { preferredId: 'jperm-2' },
      22: { preferredId: 'preferred', alternatives: [{ label: 'no id' }] },
    });
    expect(restored[27].preferredId).toBe(DEFAULT_ID);
    expect(restored[27].alternatives).toHaveLength(1);
    expect(restored[21]).toEqual(emptyCaseAlgorithms());
    expect(restored[22]).toEqual(emptyCaseAlgorithms());
    expect(restoreAlgorithms(ollCases, null)[1]).toEqual(emptyCaseAlgorithms());
  });

  it('keeps the invariant through a long random sequence of edits', () => {
    let seed = 7;
    const pick = (count: number) => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed % count;
    };
    const texts = [ANTI_SUNE_ANGLE, "R U R' D", sune.algorithm];
    let state = emptyCaseAlgorithms();
    for (let step = 0; step < 1000; step += 1) {
      const customIds = [...state.alternatives.map(({ id }) => id), `alt-${step}`];
      const allIds = [...variantsFor(sune, state).map(({ id }) => id), 'missing'];
      switch (pick(3)) {
        case 0:
          state = saveCustom(
            state,
            { id: customIds[pick(customIds.length)], label: 'Mine', algorithm: texts[pick(3)] },
            pick(2) ? VERIFIED_AT : undefined,
          ).state;
          break;
        case 1:
          state = makePreferred(sune, state, allIds[pick(allIds.length)]) ?? state;
          break;
        default:
          state = deleteCustom(state, customIds[pick(customIds.length)]);
      }
      expect(isValidPreferred(sune, state), `step ${step}`).toBe(true);
    }
  });
});
