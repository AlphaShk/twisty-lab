import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bookmark,
  Box,
  Check,
  ChevronRight,
  CircleHelp,
  Code2,
  Copy,
  ExternalLink,
  Eye,
  Library,
  Minus,
  Pencil,
  Plus,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Square,
  Star,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { TwistyPlayer } from 'cubing/twisty';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { invertAlgorithm, isPlayable, verifyAlgorithm, type VerificationResult } from './cube';
import { groups, ollCases, type OllCase } from './data';
import { displayAlg, splitIntoPhrases, type Phrase } from './notation';

type View = 'learn' | 'library' | 'progress';
type CubeView = '2D' | '3D';
type LearningStatus = 'unlearned' | 'learning' | 'learned';

type CaseProgress = {
  note: string;
  bookmarked: boolean;
  visited: boolean;
  status: LearningStatus;
};

type ProgressMap = Record<number, CaseProgress>;

type AlternativeAlgorithm = {
  id: string;
  label: string;
  algorithm: string;
  verifiedAt: string | null;
};

type CaseAlgorithmState = {
  preferredId: string;
  alternatives: AlternativeAlgorithm[];
};

type AlgorithmMap = Record<number, CaseAlgorithmState>;

type AlgorithmVariant = AlternativeAlgorithm & {
  official: boolean;
  source: 'preferred' | 'jperm' | 'custom';
};

// The Electron preload script exposes `window.desktop`; in a browser it is undefined.
const isDesktop = typeof window !== 'undefined' && window.desktop !== undefined;
const JPERM_URL = 'https://jperm.net/algs/oll';
const SOURCE_URL = 'https://github.com/AlphaShk/twisty-lab';

const initialProgress = (): ProgressMap => Object.fromEntries(
  ollCases.map(({ number }) => [number, {
    note: '',
    bookmarked: false,
    visited: false,
    status: 'unlearned',
  }]),
);

const initialAlgorithms = (): AlgorithmMap => Object.fromEntries(
  ollCases.map(({ number }) => [number, { preferredId: 'preferred', alternatives: [] }]),
);

function useStoredProgress() {
  const [progress, setProgress] = useState<ProgressMap>(() => {
    const defaults = initialProgress();
    try {
      const parsed = JSON.parse(localStorage.getItem('twisty-lab-progress-v2') ?? '{}') as Partial<ProgressMap>;
      return Object.fromEntries(ollCases.map(({ number }) => [number, { ...defaults[number], ...parsed[number] }]));
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('twisty-lab-progress-v2', JSON.stringify(progress));
    } catch {
      // Storage can be unavailable (private mode, blocked site data); the app still works for this session.
    }
  }, [progress]);
  return [progress, setProgress] as const;
}

function useStoredAlgorithms() {
  const [algorithms, setAlgorithms] = useState<AlgorithmMap>(() => {
    const defaults = initialAlgorithms();
    try {
      const parsed = JSON.parse(localStorage.getItem('twisty-lab-algorithms-v1') ?? '{}') as Partial<AlgorithmMap>;
      return Object.fromEntries(ollCases.map(({ number }) => {
        const stored = parsed[number];
        return [number, {
          ...defaults[number],
          ...stored,
          preferredId: !stored?.preferredId || stored.preferredId === 'official' ? 'preferred' : stored.preferredId,
        }];
      }));
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('twisty-lab-algorithms-v1', JSON.stringify(algorithms));
    } catch {
      // See useStoredProgress.
    }
  }, [algorithms]);
  return [algorithms, setAlgorithms] as const;
}

function usePlayable(algorithm: string) {
  const [playable, setPlayable] = useState(true);
  useEffect(() => {
    let current = true;
    isPlayable(algorithm).then((value) => { if (current) setPlayable(value); });
    return () => { current = false; };
  }, [algorithm]);
  return playable;
}

function CaseImage({ item, compact = false }: { item: OllCase; compact?: boolean }) {
  return (
    <div className={`case-image-wrap ${compact ? 'compact' : ''}`}>
      <img src={item.image} alt={`OLL ${item.number} top view`} width={120} height={120} loading="lazy" draggable="false" />
    </div>
  );
}

type SimulationProps = {
  item: OllCase;
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

function CubeSimulation({ item, algorithm, view, phrase }: SimulationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const caseSetup = useMemo(() => `${HOLD_YELLOW_ON_TOP} ${invertAlgorithm(item.algorithm)}`, [item.algorithm]);
  const setup = phrase?.before ? `${caseSetup} ${phrase.before}` : caseSetup;
  const alg = phrase ? phrase.moves : algorithm;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    // Create the player right away (creating it after an await rendered the
    // masked cube washed out), showing the bare case until the notation is checked.
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
    player.setAttribute('aria-label', `${view} simulation of OLL ${item.number}`);
    container.replaceChildren(player);

    // Invalid notation would put the player into an error state, so it keeps showing the bare case.
    isPlayable(`${setup} ${alg}`).then((playable) => {
      if (cancelled || !playable) return;
      player.experimentalSetupAlg = setup;
      player.alg = alg;
    });

    return () => {
      cancelled = true;
      player.remove();
    };
  }, [alg, caseSetup, item.number, setup, view]);

  return <div className={`cube-simulation ${view === '2D' ? 'two-d' : 'three-d'}`} ref={containerRef} />;
}

function getVariants(item: OllCase, state: CaseAlgorithmState): AlgorithmVariant[] {
  return [
    { id: 'preferred', label: 'Preferred', algorithm: item.algorithm, verifiedAt: 'builtin', official: true, source: 'preferred' },
    ...item.websiteAlgorithms.map((algorithm, index) => ({
      id: `jperm-${index + 1}`,
      label: `JPerm ${index + 1}`,
      algorithm,
      verifiedAt: 'builtin',
      official: true,
      source: 'jperm' as const,
    })),
    ...state.alternatives.map((variant) => ({ ...variant, official: false, source: 'custom' as const })),
  ];
}

const statusLabel: Record<LearningStatus, string> = {
  unlearned: 'Unlearned',
  learning: 'Learning',
  learned: 'Learned',
};

function App() {
  const workspaceRef = useRef<HTMLElement>(null);
  const [view, setView] = useState<View>('library');
  const [cubeView, setCubeView] = useState<CubeView>('3D');
  const [selectedNumber, setSelectedNumber] = useState(21);
  const [selectedAlgorithmId, setSelectedAlgorithmId] = useState('preferred');
  const [progress, setProgress] = useStoredProgress();
  const [algorithmMap, setAlgorithmMap] = useStoredAlgorithms();
  const [librarySearch, setLibrarySearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('All groups');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [draftAlgorithm, setDraftAlgorithm] = useState(ollCases[20].algorithm);
  const [draftLabel, setDraftLabel] = useState('Preferred');
  const [editingNew, setEditingNew] = useState(false);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [activePhrase, setActivePhrase] = useState<number | null>(null);
  const [compareNumber, setCompareNumber] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState('');

  const selected = ollCases.find((item) => item.number === selectedNumber) ?? ollCases[20];
  const currentProgress = progress[selected.number];
  const currentAlgorithms = algorithmMap[selected.number];
  const variants = getVariants(selected, currentAlgorithms);
  const selectedVariant = editingNew
    ? null
    : variants.find((variant) => variant.id === selectedAlgorithmId) ?? variants[0];
  // Built-in algorithms are read-only and shown as-is; custom ones come from the editor.
  const activeAlgorithm = selectedVariant?.official ? selectedVariant.algorithm : draftAlgorithm;
  const phrases = useMemo(() => splitIntoPhrases(activeAlgorithm), [activeAlgorithm]);
  const focusedPhrase = activePhrase === null ? null : phrases[activePhrase] ?? null;
  const playable = usePlayable(activeAlgorithm);
  const compareCase = compareNumber ? ollCases.find((item) => item.number === compareNumber) : null;
  const groupMate = ollCases.find((item) => item.group === selected.group && item.number !== selected.number);

  const learnedCount = Object.values(progress).filter((item) => item.status === 'learned').length;
  const learningCount = Object.values(progress).filter((item) => item.status === 'learning').length;
  const coverage = Math.round(learnedCount / ollCases.length * 100);
  const customCount = Object.values(algorithmMap).reduce((total, item) => total + item.alternatives.length, 0);
  const verifiedCount = Object.values(algorithmMap).reduce(
    (total, item) => total + item.alternatives.filter((variant) => Boolean(variant.verifiedAt)).length,
    0,
  );

  const filteredLibraryCases = useMemo(() => ollCases.filter((item) => {
    const needle = librarySearch.toLowerCase().trim();
    const preferred = getVariants(item, algorithmMap[item.number]).find(
      (variant) => variant.id === algorithmMap[item.number].preferredId,
    );
    const preferredAlgorithm = preferred?.algorithm ?? item.algorithm;
    const matchesSearch = !needle
      || `${item.number}`.includes(needle)
      || item.group.toLowerCase().includes(needle)
      || item.cue.toLowerCase().includes(needle)
      || preferredAlgorithm.toLowerCase().includes(needle);
    const matchesStatus = statusFilter === 'All statuses'
      || progress[item.number].status === statusFilter;
    return matchesSearch
      && matchesStatus
      && (groupFilter === 'All groups' || item.group === groupFilter);
  }), [algorithmMap, groupFilter, librarySearch, progress, statusFilter]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 1800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    // Wide layouts scroll inside the workspace, narrow ones scroll the page.
    workspaceRef.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [selectedNumber, view]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement | null;
      if (element?.matches('input, textarea, select') || view !== 'learn') return;
      if (event.key === 'ArrowRight') selectRelative(1);
      if (event.key === 'ArrowLeft') selectRelative(-1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  function markVisited(number: number) {
    setProgress((current) => ({ ...current, [number]: { ...current[number], visited: true } }));
  }

  function openCase(number: number) {
    const itemState = algorithmMap[number];
    const item = ollCases.find((candidate) => candidate.number === number)!;
    const preferred = getVariants(item, itemState).find((variant) => variant.id === itemState.preferredId)
      ?? getVariants(item, itemState)[0];
    setSelectedNumber(number);
    setSelectedAlgorithmId(preferred.id);
    setEditingNew(false);
    setVerification(null);
    setActivePhrase(null);
    setCompareNumber(null);
    markVisited(number);
    setView('learn');
    setDraftAlgorithm(preferred.algorithm);
    setDraftLabel(preferred.label);
  }

  function selectRelative(direction: number) {
    const index = ollCases.findIndex((item) => item.number === selected.number);
    const next = ollCases[(index + direction + ollCases.length) % ollCases.length];
    openCase(next.number);
  }

  function selectVariant(variant: AlgorithmVariant) {
    setSelectedAlgorithmId(variant.id);
    setDraftAlgorithm(variant.algorithm);
    setDraftLabel(variant.label);
    setEditingNew(false);
    setVerification(null);
    setActivePhrase(null);
  }

  function beginNewAlternative() {
    setEditingNew(true);
    setSelectedAlgorithmId('new');
    setDraftAlgorithm(selected.algorithm);
    setDraftLabel(`My algorithm ${currentAlgorithms.alternatives.length + 1}`);
    setVerification(null);
    setActivePhrase(null);
  }

  function saveAlternative(options?: { verified?: boolean; normalized?: string }) {
    const algorithm = options?.normalized ?? draftAlgorithm.trim();
    if (!algorithm) {
      setToast('Enter an algorithm first');
      return null;
    }

    const existing = currentAlgorithms.alternatives.find((variant) => variant.id === selectedAlgorithmId);
    const id = existing?.id ?? `alt-${Date.now()}`;
    const verifiedAt = options?.verified
      ? new Date().toISOString()
      : existing?.algorithm === algorithm
        ? existing.verifiedAt
        : null;
    const saved: AlternativeAlgorithm = {
      id,
      label: draftLabel.trim() || 'My algorithm',
      algorithm,
      verifiedAt,
    };

    setAlgorithmMap((current) => {
      const caseState = current[selected.number];
      const alternatives = caseState.alternatives.some((variant) => variant.id === id)
        ? caseState.alternatives.map((variant) => variant.id === id ? saved : variant)
        : [...caseState.alternatives, saved];
      return { ...current, [selected.number]: { ...caseState, alternatives } };
    });
    setSelectedAlgorithmId(id);
    setEditingNew(false);
    setDraftAlgorithm(algorithm);
    setToast(options?.verified ? 'Verified and saved' : 'Alternative saved');
    return id;
  }

  async function runVerification() {
    setVerifying(true);
    setVerification(null);
    const result = await verifyAlgorithm(selected.algorithm, activeAlgorithm);
    setVerification(result);
    setVerifying(false);
    if (result.correct && !selectedVariant?.official) saveAlternative({ verified: true, normalized: result.normalized });
  }

  function markPreferred() {
    const id = editingNew ? null : selectedAlgorithmId;
    const active = currentAlgorithms.alternatives.find((variant) => variant.id === id);
    if (!selectedVariant?.official && !active?.verifiedAt) {
      setToast('Verify this algorithm before making it preferred');
      return;
    }
    setAlgorithmMap((current) => ({
      ...current,
      [selected.number]: { ...current[selected.number], preferredId: id ?? 'preferred' },
    }));
    setToast(id === 'preferred' ? 'Curated algorithm restored as preferred' : 'Preferred algorithm updated');
  }

  function deleteAlternative() {
    if (selectedVariant?.official || editingNew) return;
    if (!window.confirm(`Delete “${draftLabel}”?`)) return;
    setAlgorithmMap((current) => {
      const caseState = current[selected.number];
      return {
        ...current,
        [selected.number]: {
          preferredId: caseState.preferredId === selectedAlgorithmId ? 'preferred' : caseState.preferredId,
          alternatives: caseState.alternatives.filter((variant) => variant.id !== selectedAlgorithmId),
        },
      };
    });
    selectVariant(variants[0]);
    setToast('Alternative deleted');
  }

  function toggleBookmark(number: number) {
    setProgress((current) => ({
      ...current,
      [number]: { ...current[number], bookmarked: !current[number].bookmarked },
    }));
  }

  function setLearningStatus(number: number, status: LearningStatus) {
    setProgress((current) => ({
      ...current,
      [number]: { ...current[number], status },
    }));
    setToast(`OLL ${number} marked ${statusLabel[status].toLowerCase()}`);
  }

  async function copyAlgorithm() {
    const text = activeAlgorithm.trim();
    if (!text) {
      setToast('Nothing to copy yet');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setToast('Algorithm copied');
    } catch {
      setToast('Copying is blocked here; select the text instead');
    }
  }

  function resetData() {
    if (!window.confirm('Reset all Twisty Lab learning statuses, notes, bookmarks, and custom algorithms?')) return;
    setProgress(initialProgress());
    setAlgorithmMap(initialAlgorithms());
    setSettingsOpen(false);
    setSelectedNumber(21);
    setSelectedAlgorithmId('preferred');
    setDraftAlgorithm(ollCases[20].algorithm);
    setDraftLabel('Preferred');
    setActivePhrase(null);
    setView('library');
    setToast('Local learning data reset');
  }

  const selectedIsPreferred = currentAlgorithms.preferredId === selectedAlgorithmId && !editingNew;
  const selectedIsVerified = Boolean(selectedVariant?.official)
    || Boolean(currentAlgorithms.alternatives.find((variant) => variant.id === selectedAlgorithmId)?.verifiedAt)
    || Boolean(verification?.correct);
  const simulationCaption = !playable
    ? 'Enter valid cube notation to animate it'
    : focusedPhrase && activePhrase !== null
      ? `Phrase ${activePhrase + 1} of ${phrases.length}, starting after ${activePhrase === 0 ? 'the case setup' : `phrase ${activePhrase}`}`
      : 'Use the controls to step through each move';

  return (
    <div className={`desktop-app ${isDesktop ? 'is-desktop' : 'is-web'}`}>
      {isDesktop && (
        <div className="window-bar">
          <div className="window-drag-region">
            <div className="window-brand"><span className="cube-glyph"><i /><i /><i /></span>Twisty Lab</div>
            <span className="window-context">Offline algorithm workbench</span>
          </div>
          {window.desktop?.platform !== 'darwin' && (
            <div className="window-controls">
              <button aria-label="Minimize" onClick={() => window.desktop?.minimize()}><Minus size={14} /></button>
              <button aria-label="Maximize" onClick={() => window.desktop?.maximize()}><Square size={11} /></button>
              <button className="close" aria-label="Close" onClick={() => window.desktop?.close()}><X size={14} /></button>
            </div>
          )}
        </div>
      )}

      <div className="app-frame">
        <aside className="sidebar">
          <div className="brand-mark" aria-label="Twisty Lab" title="Twisty Lab"><span>TL</span></div>
          <nav className="main-nav" aria-label="Main navigation">
            <button className={view === 'library' || view === 'learn' ? 'active' : ''} onClick={() => setView('library')}><Library /><span>Library</span></button>
            <button className={view === 'progress' ? 'active' : ''} onClick={() => setView('progress')}><BarChart3 /><span>Progress</span></button>
          </nav>
          <div className="sidebar-bottom">
            {!isDesktop && (
              <a className="icon-button" href={SOURCE_URL} target="_blank" rel="noreferrer" aria-label="Source code on GitHub" title="Source code on GitHub"><Code2 /></a>
            )}
            <button className="icon-button" aria-label="Settings" title="Settings" onClick={() => setSettingsOpen(true)}><Settings /></button>
          </div>
        </aside>

        <main className="workspace" ref={workspaceRef}>
          {view === 'learn' && (
            <>
              <Header eyebrow="OLL WORKBENCH" title={`OLL ${selected.number} · ${selected.group}`} score={coverage} label="Cases learned" />
              <div className="detail-back-row"><button onClick={() => setView('library')}><ArrowLeft /> Back to library</button><span className="keyboard-hint">Use ← → to move between cases</span></div>
              <div className="study-layout workbench-layout detail-layout">
                <section className="lesson-card workbench-card">
                  <div className="lesson-topline">
                    <div className="case-id"><span>OLL {selected.number}</span><button aria-label="Bookmark case" aria-pressed={currentProgress.bookmarked} className={currentProgress.bookmarked ? 'bookmarked' : ''} onClick={() => toggleBookmark(selected.number)}><Bookmark /></button></div>
                    <div className="lesson-top-actions">
                      <StatusPicker value={currentProgress.status} onChange={(status) => setLearningStatus(selected.number, status)} />
                      <div className="view-switch" role="group" aria-label="Cube visualization">
                        <button className={cubeView === '2D' ? 'active' : ''} aria-pressed={cubeView === '2D'} onClick={() => setCubeView('2D')}><Eye />2D</button>
                        <button className={cubeView === '3D' ? 'active' : ''} aria-pressed={cubeView === '3D'} onClick={() => setCubeView('3D')}><Box />3D</button>
                      </div>
                    </div>
                  </div>

                  <div className="simulation-main">
                    <div className="simulation-shell">
                      <CubeSimulation item={selected} algorithm={activeAlgorithm} view={cubeView} phrase={focusedPhrase} />
                      <span className="simulation-caption">{simulationCaption}</span>
                    </div>
                    <div className="lesson-copy compact-copy">
                      <p className="eyebrow">RECOGNITION</p>
                      <h2>{selected.cue}</h2>
                      <p>{selected.hint}</p>
                      <div className="chips"><span>{selected.group}</span><span>OLL {selected.number}</span></div>
                    </div>
                  </div>

                  <div className="algorithm-workbench">
                    <div className="variant-strip">
                      <div className="variant-tabs" role="tablist" aria-label="Algorithms for this case">
                        {variants.map((variant) => (
                          <button
                            role="tab"
                            aria-selected={!editingNew && variant.id === selectedAlgorithmId}
                            className={!editingNew && variant.id === selectedAlgorithmId ? 'active' : ''}
                            key={variant.id}
                            onClick={() => selectVariant(variant)}
                          >
                            {variant.official ? <ShieldCheck /> : variant.verifiedAt ? <Check /> : <Pencil />}
                            {variant.label}
                            {currentAlgorithms.preferredId === variant.id && <Star className="preferred-star" />}
                          </button>
                        ))}
                      </div>
                      <button className={`add-alg-button ${editingNew ? 'active' : ''}`} onClick={beginNewAlternative}><Plus /> Add alternative</button>
                    </div>

                    <div className="editor-heading">
                      <div>
                        <p className="eyebrow">{selectedVariant?.official ? 'BUILT-IN ALGORITHM' : 'YOUR ALGORITHM'}</p>
                        {selectedVariant?.official ? (
                          selectedVariant.source === 'preferred'
                            ? <b>Curated preferred list</b>
                            : <b>Imported from <a href={JPERM_URL} target="_blank" rel="noreferrer">JPerm <ExternalLink /></a></b>
                        ) : (
                          <input aria-label="Algorithm name" value={draftLabel} onChange={(event) => setDraftLabel(event.target.value)} placeholder="Algorithm name" />
                        )}
                      </div>
                      <div className="editor-badges">
                        {selectedIsPreferred && <span className="preferred-badge"><Star /> Preferred</span>}
                        {selectedIsVerified && <span className="verified-badge"><Check /> Verified</span>}
                      </div>
                    </div>

                    {selectedVariant?.official ? (
                      <div className="official-algorithm"><code>{displayAlg(selectedVariant.algorithm)}</code><button aria-label="Copy built-in algorithm" onClick={copyAlgorithm}><Copy /></button></div>
                    ) : (
                      <textarea
                        className="algorithm-editor"
                        aria-label="Edit algorithm"
                        value={draftAlgorithm}
                        onChange={(event) => { setDraftAlgorithm(event.target.value); setVerification(null); setActivePhrase(null); }}
                        placeholder="Enter cube notation, for example R U R' U R U2 R'"
                        spellCheck="false"
                      />
                    )}

                    <div className="chunk-panel workbench-chunks">
                      <div className="chunk-heading"><span>Move phrases</span><small>{phrases.length ? 'Pick a phrase to play it on its own' : 'Phrases appear once the notation parses'}</small></div>
                      {phrases.length > 0 && (
                        <div className="chunk-row" role="group" aria-label="Move phrases">
                          <button className={activePhrase === null ? 'active' : ''} aria-pressed={activePhrase === null} onClick={() => setActivePhrase(null)}>
                            <span><Box /></span><code>Full algorithm</code>
                          </button>
                          {phrases.map((phrase, index) => (
                            <button
                              className={activePhrase === index ? 'active' : ''}
                              aria-pressed={activePhrase === index}
                              onClick={() => setActivePhrase(activePhrase === index ? null : index)}
                              key={`${index}-${phrase.moves}`}
                            >
                              <span>{index + 1}</span><code>{phrase.label}</code>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {verification && (
                      <div className={`verification-result ${verification.correct ? 'correct' : 'incorrect'}`} role="status">
                        {verification.correct ? <Check /> : <X />}
                        <div><b>{verification.correct ? 'Correct for this OLL case' : 'Not correct for this case'}</b><span>{verification.message}</span></div>
                        {verification.syntaxValid && <small>{verification.moveCount} moves</small>}
                      </div>
                    )}

                    <div className="editor-actions">
                      <button onClick={copyAlgorithm}><Copy /> Copy</button>
                      {!selectedVariant?.official && <button onClick={() => saveAlternative()}><Save /> Save</button>}
                      <button className="verify-button" onClick={runVerification} disabled={verifying || !activeAlgorithm.trim()}><ShieldCheck />{verifying ? 'Simulating…' : 'Verify on cube'}</button>
                      <button className="preferred-button" onClick={markPreferred} disabled={selectedIsPreferred}><Star />{selectedIsPreferred ? 'Preferred' : 'Make preferred'}</button>
                      {!selectedVariant?.official && !editingNew && <button className="delete-button" aria-label="Delete alternative" onClick={deleteAlternative}><Trash2 /></button>}
                    </div>
                  </div>

                  <div className="lesson-pagination">
                    <button onClick={() => selectRelative(-1)}><ArrowLeft /> Previous</button>
                    <span>{selected.number} / 57</span>
                    <button onClick={() => selectRelative(1)}>Next <ArrowRight /></button>
                  </div>
                </section>

                <aside className="insight-panel tools-panel">
                  <div className="insight-heading"><p className="eyebrow">CASE NOTES</p><h2>Recognition & tools</h2></div>
                  <div className="memory-card accent"><span>Recognition cue</span><b>“{selected.cue}”</b><p>{selected.hint}</p></div>
                  <div className="memory-card note-card">
                    <span>Your note</span>
                    <textarea
                      aria-label="Personal note"
                      value={currentProgress.note}
                      onChange={(event) => setProgress((current) => ({ ...current, [selected.number]: { ...current[selected.number], note: event.target.value } }))}
                      placeholder="Add a finger-trick, grip, or recognition cue…"
                    />
                    <small>Saved on this device</small>
                  </div>
                  <div className="rules-card">
                    <span><ShieldCheck /> Verification rules</span>
                    <ul><li>All top stickers oriented</li><li>First two layers preserved</li><li>Different PLL and final AUF accepted</li></ul>
                  </div>
                  {groupMate && (
                    <button className="confusion-card" onClick={() => setCompareNumber(groupMate.number)}>
                      <span><Sparkles /> Similar case</span><b>Compare with OLL {groupMate.number}</b><small>Same shape family <ChevronRight /></small>
                    </button>
                  )}
                </aside>
              </div>
            </>
          )}

          {view === 'library' && (
            <LibraryView
              cases={filteredLibraryCases}
              progress={progress}
              algorithms={algorithmMap}
              coverage={coverage}
              search={librarySearch}
              setSearch={setLibrarySearch}
              groupFilter={groupFilter}
              setGroupFilter={setGroupFilter}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              openCase={openCase}
              toggleBookmark={toggleBookmark}
              setLearningStatus={setLearningStatus}
            />
          )}

          {view === 'progress' && (
            <ProgressView progress={progress} algorithms={algorithmMap} coverage={coverage} learnedCount={learnedCount} learningCount={learningCount} customCount={customCount} verifiedCount={verifiedCount} openCase={openCase} />
          )}
        </main>
      </div>

      {compareCase && (
        <div className="modal-backdrop" onMouseDown={() => setCompareNumber(null)}>
          <section className="compare-modal" role="dialog" aria-modal="true" aria-label="Compare similar OLL cases" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-heading"><div><p className="eyebrow">SIMILAR CASES</p><h2>Spot the difference</h2></div><button aria-label="Close comparison" onClick={() => setCompareNumber(null)}><X /></button></div>
            <div className="compare-grid">
              {[selected, compareCase].map((item) => (
                <div className="compare-case" key={item.number}><CaseImage item={item} /><span>OLL {item.number}</span><h3>{item.cue}</h3><p>{item.hint}</p><code>{displayAlg(item.algorithm)}</code></div>
              ))}
            </div>
            <div className="compare-tip"><CircleHelp /><span>Use side stickers to separate cases that share a similar top silhouette.</span></div>
          </section>
        </div>
      )}

      {settingsOpen && (
        <div className="modal-backdrop" onMouseDown={() => setSettingsOpen(false)}>
          <section className="settings-modal" role="dialog" aria-modal="true" aria-label="Settings" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-heading"><div><p className="eyebrow">TWISTY LAB</p><h2>Settings</h2></div><button aria-label="Close settings" onClick={() => setSettingsOpen(false)}><X /></button></div>
            <div className="setting-row"><div><b>Offline by design</b><span>Learning statuses, notes, preferred algorithms, and verification results stay on this device.</span></div><span className="offline-badge"><Check /> Local</span></div>
            <div className="setting-row"><div><b>Verification model</b><span>Different PLL outcomes and a final AUF are accepted when OLL is oriented and F2L stays solved.</span></div></div>
            <div className="setting-row">
              <div>
                <b>Credits</b>
                <span>Algorithms and shape names from <a href={JPERM_URL} target="_blank" rel="noreferrer">JPerm</a>. Cube model and player by <a href="https://js.cubing.net/cubing/" target="_blank" rel="noreferrer">cubing.js</a>. Icons by <a href="https://lucide.dev" target="_blank" rel="noreferrer">Lucide</a>. <a href={SOURCE_URL} target="_blank" rel="noreferrer">Source code</a> under the MIT license.</span>
              </div>
            </div>
            <button className="reset-button" onClick={resetData}>Reset local data</button>
          </section>
        </div>
      )}

      {toast && <div className="toast" role="status"><Check />{toast}</div>}
    </div>
  );
}

function Header({ eyebrow, title, score, label }: { eyebrow: string; title: string; score: number; label: string }) {
  return (
    <header className="topbar">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div>
      <div className="progress-summary"><span>{label}</span><b>{score}%</b><div className="progress-track"><i style={{ width: `${score}%` }} /></div></div>
    </header>
  );
}

type LibraryProps = {
  cases: OllCase[];
  progress: ProgressMap;
  algorithms: AlgorithmMap;
  coverage: number;
  search: string;
  setSearch: (value: string) => void;
  groupFilter: string;
  setGroupFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  openCase: (number: number) => void;
  toggleBookmark: (number: number) => void;
  setLearningStatus: (number: number, status: LearningStatus) => void;
};

function StatusPicker({ value, onChange, compact = false }: { value: LearningStatus; onChange: (status: LearningStatus) => void; compact?: boolean }) {
  const statuses: LearningStatus[] = ['unlearned', 'learning', 'learned'];
  return (
    <div className={`status-picker ${compact ? 'compact' : ''}`} role="group" aria-label="Learning status">
      {statuses.map((status) => (
        <button
          className={`${status} ${value === status ? 'active' : ''}`}
          aria-pressed={value === status}
          onClick={(event) => { event.stopPropagation(); onChange(status); }}
          key={status}
        >
          {statusLabel[status]}
        </button>
      ))}
    </div>
  );
}

function LibraryView({ cases, progress, algorithms, coverage, search, setSearch, groupFilter, setGroupFilter, statusFilter, setStatusFilter, openCase, toggleBookmark, setLearningStatus }: LibraryProps) {
  const builtInCount = ollCases.reduce((total, item) => total + 1 + item.websiteAlgorithms.length, 0);
  return (
    <>
      <Header eyebrow="OLL REFERENCE" title="Algorithm library" score={coverage} label="Cases learned" />
      <div className="library-page">
        <div className="library-intro">
          <div><h2>All 57 OLL cases</h2><p>Set each learning state here, then open a case to inspect, simulate, or customize its algorithms.</p></div>
          <div className="library-stat"><span>Built-in algorithms</span><b>{builtInCount}</b></div>
        </div>
        <div className="filter-bar">
          <label className="search-box"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search OLL, group, cue, or algorithm" aria-label="Search cases" /></label>
          <select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)} aria-label="Filter by shape group"><option>All groups</option>{groups.map((group) => <option key={group}>{group}</option>)}</select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by learning status">
            <option>All statuses</option>
            <option value="unlearned">Unlearned</option>
            <option value="learning">Learning</option>
            <option value="learned">Learned</option>
          </select>
          <span className="result-count">{cases.length} cases</span>
        </div>
        <div className="case-grid">
          {cases.map((item) => {
            const caseAlgorithms = algorithms[item.number];
            const variants = getVariants(item, caseAlgorithms);
            const preferred = variants.find((variant) => variant.id === caseAlgorithms.preferredId) ?? variants[0];
            const shownAlgorithm = preferred.algorithm;
            const verified = caseAlgorithms.alternatives.filter((variant) => variant.verifiedAt).length;
            const alternativeCount = item.websiteAlgorithms.length + caseAlgorithms.alternatives.length;
            return (
              <article className={`case-card status-${progress[item.number].status}`} key={item.number} onClick={() => openCase(item.number)}>
                <div className="card-top"><span>OLL {item.number}</span><button aria-label={`Bookmark OLL ${item.number}`} aria-pressed={progress[item.number].bookmarked} className={progress[item.number].bookmarked ? 'bookmarked' : ''} onClick={(event) => { event.stopPropagation(); toggleBookmark(item.number); }}><Bookmark /></button></div>
                <CaseImage item={item} />
                <div className="card-copy">
                  <small>{item.group}</small><h3>{item.cue}</h3><code>{displayAlg(shownAlgorithm)}</code>
                  <StatusPicker compact value={progress[item.number].status} onChange={(status) => setLearningStatus(item.number, status)} />
                </div>
                <div className="card-footer"><span>{alternativeCount} alternative{alternativeCount === 1 ? '' : 's'}{verified ? ` · ${verified} verified` : ''}</span><button className="open-case" aria-label={`Open OLL ${item.number}`} onClick={(event) => { event.stopPropagation(); openCase(item.number); }}>Open <ChevronRight /></button></div>
              </article>
            );
          })}
        </div>
        {cases.length === 0 && <div className="empty-state"><Search /><h3>No matching cases</h3><p>Try a case number, a shape name, or one of the moves.</p></div>}
      </div>
    </>
  );
}

function ProgressView({ progress, algorithms, coverage, learnedCount, learningCount, customCount, verifiedCount, openCase }: { progress: ProgressMap; algorithms: AlgorithmMap; coverage: number; learnedCount: number; learningCount: number; customCount: number; verifiedCount: number; openCase: (number: number) => void }) {
  const bookmarked = Object.values(progress).filter((item) => item.bookmarked).length;
  const unlearnedCount = ollCases.length - learnedCount - learningCount;
  const groupStats = groups.map((group) => {
    const cases = ollCases.filter((item) => item.group === group);
    const learned = cases.filter((item) => progress[item.number].status === 'learned').length;
    return { group, count: cases.length, score: Math.round(learned / cases.length * 100) };
  }).sort((a, b) => b.score - a.score);
  const learningCases = ollCases.filter((item) => progress[item.number].status === 'learning');

  return (
    <>
      <Header eyebrow="YOUR NOTEBOOK" title="Learning progress" score={coverage} label="Cases learned" />
      <div className="progress-page">
        <section className="progress-hero"><div><p className="eyebrow">OLL COMPLETION</p><strong>{coverage}%</strong><p>{learnedCount} of 57 cases are marked learned.</p></div><div className="mastery-orbit" style={{ '--score': `${coverage * 3.6}deg` } as CSSProperties}><span>{coverage}%<small>learned</small></span></div></section>
        <div className="stat-grid four-stats">
          <div><Target /><span>Learned</span><b>{learnedCount}<small>/57</small></b></div>
          <div><Sparkles /><span>Learning</span><b>{learningCount}</b></div>
          <div><CircleHelp /><span>Unlearned</span><b>{unlearnedCount}</b></div>
          <div><Bookmark /><span>Bookmarked</span><b>{bookmarked}</b></div>
        </div>
        <div className="progress-columns">
          <section className="group-progress"><div className="section-heading"><div><p className="eyebrow">BY SHAPE</p><h2>Learned by group</h2></div><span>{groups.length} families</span></div><div className="group-bars">{groupStats.map((item) => <div className="group-bar" key={item.group}><div><b>{item.group}</b><span>{item.count} cases</span></div><div className="bar-track"><i style={{ width: `${item.score}%` }} /></div><strong>{item.score}%</strong></div>)}</div></section>
          <section className="review-list"><div className="section-heading"><div><p className="eyebrow">IN PROGRESS</p><h2>Learning now</h2></div><span>{learningCases.length}</span></div>{learningCases.slice(0, 7).map((item) => <button key={item.number} onClick={() => openCase(item.number)}><CaseImage item={item} compact /><span><b>OLL {item.number}</b><small>{1 + item.websiteAlgorithms.length + algorithms[item.number].alternatives.length} available algorithms</small></span><ChevronRight /></button>)}{!learningCases.length && <div className="mini-empty"><Sparkles /><p>Cases marked Learning will appear here for quick access.</p></div>}</section>
        </div>
        <div className="progress-footnote">{customCount} custom algorithms · {verifiedCount} simulator-verified</div>
      </div>
    </>
  );
}

export default App;
