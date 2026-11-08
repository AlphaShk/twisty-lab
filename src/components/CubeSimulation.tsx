import { TwistyPlayer } from 'cubing/twisty';
import { useEffect, useMemo, useRef } from 'react';
import { invertAlgorithm, isPlayable } from '../cube';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import type { Phrase } from '../notation';

export type CubeView = '2D' | '3D';

type SimulationProps = {
  caseNumber: number;
  /** Reference algorithm of the case; its inverse sets the case up. */
  caseAlgorithm: string;
  algorithm: string;
  view: CubeView;
  /** When set, only this phrase is played, starting from the position before it. */
  phrase: Phrase | null;
};

// cubing.js colours the U face white. Holding the cube with yellow on top (a z2
// flip before the case setup) matches the case diagrams. The OLL stickering is
// then reapplied to the pieces that started in the D layer: they are the last
// layer now, shown by their yellow sticker only, with F2L dimmed.
const HOLD_YELLOW_ON_TOP = 'z2';
const OLL_MASK_YELLOW_ON_TOP = 'EDGES:DDDDOOOODDDD,CORNERS:DDDDOOOO,CENTERS:DDDDD-';

// The editor changes `algorithm` on every keystroke; the cube follows once typing pauses.
const EDIT_DELAY_MS = 250;

export function CubeSimulation({
  caseNumber,
  caseAlgorithm,
  algorithm,
  view,
  phrase,
}: SimulationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<TwistyPlayer | null>(null);
  const caseSetup = useMemo(
    () => `${HOLD_YELLOW_ON_TOP} ${invertAlgorithm(caseAlgorithm)}`,
    [caseAlgorithm],
  );
  const settledAlgorithm = useDebouncedValue(algorithm, EDIT_DELAY_MS);
  const setup = phrase?.before ? `${caseSetup} ${phrase.before}` : caseSetup;
  const alg = phrase ? phrase.moves : settledAlgorithm;

  // One player per case and view. It is created right away (creating it after an
  // await rendered the masked cube washed out) and shows the bare case at first.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const player = new TwistyPlayer({
      puzzle: '3x3x3',
      experimentalSetupAlg: caseSetup,
      experimentalSetupAnchor: 'start',
      experimentalStickeringMaskOrbits: OLL_MASK_YELLOW_ON_TOP,
      visualization: view === '2D' ? 'experimental-2D-LL' : '3D',
      background: 'none',
      hintFacelets: 'none',
      controlPanel: 'bottom-row',
      viewerLink: 'none',
    });
    player.setAttribute('aria-label', `${view} simulation of OLL ${caseNumber}`);
    container.replaceChildren(player);
    playerRef.current = player;
    return () => {
      playerRef.current = null;
      player.remove();
    };
  }, [caseNumber, caseSetup, view]);

  // Invalid notation would put the player into an error state, so it keeps showing the bare case.
  // `view` is a dependency so that a new player gets the current algorithm too.
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    let cancelled = false;
    isPlayable(`${setup} ${alg}`).then((playable) => {
      if (cancelled) return;
      player.experimentalSetupAlg = playable ? setup : caseSetup;
      player.alg = playable ? alg : '';
    });
    return () => {
      cancelled = true;
    };
  }, [alg, caseSetup, setup, view]);

  return (
    <div className={`cube-simulation ${view === '2D' ? 'two-d' : 'three-d'}`} ref={containerRef} />
  );
}
