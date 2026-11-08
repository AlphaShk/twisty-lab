import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Box,
  Check,
  Copy,
  ExternalLink,
  Eye,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  Star,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  DEFAULT_ID,
  deleteCustom,
  isBuiltIn,
  isDraftVerified,
  isVerified,
  makePreferred,
  preferredVariant,
  saveCustom,
  variantsFor,
  type AlgorithmVariant,
  type BuiltInVariant,
  type CaseAlgorithms,
} from '../algorithmState';
import { verifyAlgorithm, type VerificationResult } from '../cube';
import { ollCases, type OllCase } from '../data';
import { usePlayable } from '../hooks/usePlayable';
import { JPERM_URL } from '../links';
import { displayAlg, splitIntoPhrases } from '../notation';
import type { CaseProgress, LearningStatus } from '../progress';
import { CaseNotesPanel } from './CaseNotesPanel';
import { CompareDialog } from './CompareDialog';
import { CubeSimulation, type CubeView } from './CubeSimulation';
import { Header } from './Header';
import { PhrasePicker } from './PhrasePicker';
import { StatusPicker } from './StatusPicker';
import { VerificationBanner } from './VerificationBanner';

type WorkbenchProps = {
  item: OllCase;
  progress: CaseProgress;
  algorithms: CaseAlgorithms;
  coverage: number;
  cubeView: CubeView;
  onCubeViewChange: (view: CubeView) => void;
  onAlgorithmsChange: (state: CaseAlgorithms) => void;
  onNoteChange: (note: string) => void;
  onStatusChange: (status: LearningStatus) => void;
  onToggleBookmark: () => void;
  onBack: () => void;
  onStep: (direction: number) => void;
  notify: (message: string) => void;
};

const NEW_ID = 'new';

/** The case page. It is keyed by case number, so its editor state starts fresh for every case. */
export function Workbench({
  item,
  progress,
  algorithms,
  coverage,
  cubeView,
  onCubeViewChange,
  onAlgorithmsChange,
  onNoteChange,
  onStatusChange,
  onToggleBookmark,
  onBack,
  onStep,
  notify,
}: WorkbenchProps) {
  const initial = preferredVariant(item, algorithms);
  const [selectedId, setSelectedId] = useState(initial.id);
  const [draftAlgorithm, setDraftAlgorithm] = useState(initial.algorithm);
  const [draftLabel, setDraftLabel] = useState(initial.label);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [activePhrase, setActivePhrase] = useState<number | null>(null);
  const [comparing, setComparing] = useState(false);

  const variants = variantsFor(item, algorithms);
  const editingNew = selectedId === NEW_ID;
  const selected = editingNew
    ? null
    : (variants.find((variant) => variant.id === selectedId) ?? variants[0]);
  const builtIn = selected !== null && isBuiltIn(selected);
  // Built-in algorithms are read-only and shown as-is; custom ones come from the editor.
  const activeAlgorithm = builtIn ? selected.algorithm : draftAlgorithm;
  const phrases = useMemo(() => splitIntoPhrases(activeAlgorithm), [activeAlgorithm]);
  const focusedPhrase = activePhrase === null ? null : (phrases[activePhrase] ?? null);
  const playable = usePlayable(activeAlgorithm);
  const groupMate = ollCases.find(
    (candidate) => candidate.group === item.group && candidate.number !== item.number,
  );

  const draftSaved = selected?.source === 'custom' && draftAlgorithm.trim() === selected.algorithm;
  const draftVerified = isDraftVerified(selected, draftAlgorithm, verification?.correct === true);
  const unsaved = !builtIn && !draftSaved;
  const isPreferred = selected !== null && algorithms.preferredId === selected.id && !unsaved;

  function resetEditorFeedback() {
    setVerification(null);
    setActivePhrase(null);
  }

  function selectVariant(variant: AlgorithmVariant) {
    setSelectedId(variant.id);
    setDraftAlgorithm(variant.algorithm);
    setDraftLabel(variant.label);
    resetEditorFeedback();
  }

  function beginNewAlternative() {
    setSelectedId(NEW_ID);
    setDraftAlgorithm(item.algorithm);
    setDraftLabel(`My algorithm ${algorithms.alternatives.length + 1}`);
    resetEditorFeedback();
  }

  function save(verified?: VerificationResult) {
    const algorithm = (verified?.normalized ?? draftAlgorithm).trim();
    if (!algorithm) {
      notify('Enter an algorithm first');
      return;
    }
    const id = selected?.source === 'custom' ? selected.id : `alt-${Date.now()}`;
    const result = saveCustom(
      algorithms,
      { id, label: draftLabel, algorithm },
      verified ? new Date().toISOString() : undefined,
    );
    onAlgorithmsChange(result.state);
    setSelectedId(id);
    setDraftAlgorithm(result.saved.algorithm);
    setDraftLabel(result.saved.label);
    if (verified) {
      notify(
        verified.preAuf ? `Verified and saved with ${verified.preAuf} first` : 'Verified and saved',
      );
    } else if (result.demoted) {
      notify('Saved. Verify it again to make it preferred; the default is preferred until then');
    } else {
      notify('Alternative saved');
    }
  }

  async function runVerification() {
    setVerifying(true);
    setVerification(null);
    const result = await verifyAlgorithm(item.algorithm, activeAlgorithm);
    setVerification(result);
    setVerifying(false);
    if (result.correct && !builtIn) save(result);
  }

  function markPreferred() {
    const next =
      selected && draftVerified && !unsaved ? makePreferred(item, algorithms, selected.id) : null;
    if (!selected || !next) {
      notify('Verify this algorithm before making it preferred');
      return;
    }
    onAlgorithmsChange(next);
    notify(
      selected.id === DEFAULT_ID ? 'Default restored as preferred' : 'Preferred algorithm updated',
    );
  }

  function deleteAlternative() {
    if (selected?.source !== 'custom') return;
    if (!window.confirm(`Delete “${selected.label}”?`)) return;
    onAlgorithmsChange(deleteCustom(algorithms, selected.id));
    selectVariant(variants[0]);
    notify('Alternative deleted');
  }

  async function copyAlgorithm() {
    const text = activeAlgorithm.trim();
    if (!text) {
      notify('Nothing to copy yet');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      notify('Algorithm copied');
    } catch {
      notify('Copying is blocked here; select the text instead');
    }
  }

  const simulationCaption = !playable
    ? 'Enter valid cube notation to animate it'
    : activePhrase !== null && focusedPhrase
      ? `Phrase ${activePhrase + 1} of ${phrases.length}, starting after ${
          activePhrase === 0 ? 'the case setup' : `phrase ${activePhrase}`
        }`
      : 'Use the controls to step through each move';

  return (
    <>
      <Header
        eyebrow="OLL WORKBENCH"
        title={`OLL ${item.number} · ${item.group}`}
        coverage={coverage}
      />
      <div className="detail-back-row">
        <button onClick={onBack}>
          <ArrowLeft /> Back to library
        </button>
        <span className="keyboard-hint">Use ← → to move between cases</span>
      </div>
      <div className="study-layout workbench-layout detail-layout">
        <section className="lesson-card workbench-card">
          <div className="lesson-topline">
            <div className="case-id">
              <span>OLL {item.number}</span>
              <button
                aria-label="Bookmark case"
                aria-pressed={progress.bookmarked}
                className={progress.bookmarked ? 'bookmarked' : ''}
                onClick={onToggleBookmark}
              >
                <Bookmark />
              </button>
            </div>
            <div className="lesson-top-actions">
              <StatusPicker value={progress.status} onChange={onStatusChange} />
              <div className="view-switch" role="group" aria-label="Cube visualization">
                <button
                  className={cubeView === '2D' ? 'active' : ''}
                  aria-pressed={cubeView === '2D'}
                  onClick={() => onCubeViewChange('2D')}
                >
                  <Eye />
                  2D
                </button>
                <button
                  className={cubeView === '3D' ? 'active' : ''}
                  aria-pressed={cubeView === '3D'}
                  onClick={() => onCubeViewChange('3D')}
                >
                  <Box />
                  3D
                </button>
              </div>
            </div>
          </div>

          <div className="simulation-main">
            <div className="simulation-shell">
              <CubeSimulation
                caseNumber={item.number}
                caseAlgorithm={item.algorithm}
                algorithm={activeAlgorithm}
                view={cubeView}
                phrase={focusedPhrase}
              />
              <span className="simulation-caption">{simulationCaption}</span>
            </div>
            <div className="lesson-copy compact-copy">
              <p className="eyebrow">RECOGNITION</p>
              <h2>{item.cue}</h2>
              <p>{item.hint}</p>
              <div className="chips">
                <span>{item.group}</span>
                <span>OLL {item.number}</span>
              </div>
            </div>
          </div>

          <div className="algorithm-workbench">
            <div className="variant-strip">
              <div className="variant-tabs" role="tablist" aria-label="Algorithms for this case">
                {variants.map((variant) => (
                  <button
                    role="tab"
                    aria-selected={variant.id === selected?.id}
                    className={variant.id === selected?.id ? 'active' : ''}
                    key={variant.id}
                    onClick={() => selectVariant(variant)}
                  >
                    {isBuiltIn(variant) ? (
                      <ShieldCheck />
                    ) : isVerified(variant) ? (
                      <Check />
                    ) : (
                      <Pencil />
                    )}
                    {variant.label}
                    {algorithms.preferredId === variant.id && <Star className="preferred-star" />}
                  </button>
                ))}
              </div>
              <button
                className={`add-alg-button ${editingNew ? 'active' : ''}`}
                onClick={beginNewAlternative}
              >
                <Plus /> Add alternative
              </button>
            </div>

            <div className="editor-heading">
              <div>
                <p className="eyebrow">{builtIn ? 'BUILT-IN ALGORITHM' : 'YOUR ALGORITHM'}</p>
                {builtIn ? (
                  <BuiltInSource variant={selected} />
                ) : (
                  <input
                    aria-label="Algorithm name"
                    value={draftLabel}
                    onChange={(event) => setDraftLabel(event.target.value)}
                    placeholder="Algorithm name"
                  />
                )}
              </div>
              <div className="editor-badges">
                {isPreferred && (
                  <span className="preferred-badge">
                    <Star /> Preferred
                  </span>
                )}
                {draftVerified && (
                  <span className="verified-badge">
                    <Check /> Verified
                  </span>
                )}
                {unsaved && <span className="unsaved-badge">Not saved</span>}
              </div>
            </div>

            {builtIn ? (
              <div className="official-algorithm">
                <code>{displayAlg(selected.algorithm)}</code>
                <button aria-label="Copy built-in algorithm" onClick={copyAlgorithm}>
                  <Copy />
                </button>
              </div>
            ) : (
              <textarea
                className="algorithm-editor"
                aria-label="Edit algorithm"
                value={draftAlgorithm}
                onChange={(event) => {
                  setDraftAlgorithm(event.target.value);
                  resetEditorFeedback();
                }}
                placeholder="Enter cube notation, for example R U R' U R U2 R'"
                spellCheck="false"
              />
            )}

            <PhrasePicker phrases={phrases} active={activePhrase} onChange={setActivePhrase} />

            {verification && <VerificationBanner result={verification} />}

            <div className="editor-actions">
              <button onClick={copyAlgorithm}>
                <Copy /> Copy
              </button>
              {!builtIn && (
                <button onClick={() => save()}>
                  <Save /> Save
                </button>
              )}
              <button
                className="verify-button"
                onClick={runVerification}
                disabled={verifying || !activeAlgorithm.trim()}
              >
                <ShieldCheck />
                {verifying ? 'Simulating…' : 'Verify on cube'}
              </button>
              <button className="preferred-button" onClick={markPreferred} disabled={isPreferred}>
                <Star />
                {isPreferred ? 'Preferred' : 'Make preferred'}
              </button>
              {selected?.source === 'custom' && (
                <button
                  className="delete-button"
                  aria-label="Delete alternative"
                  onClick={deleteAlternative}
                >
                  <Trash2 />
                </button>
              )}
            </div>
          </div>

          <div className="lesson-pagination">
            <button onClick={() => onStep(-1)}>
              <ArrowLeft /> Previous
            </button>
            <span>{item.number} / 57</span>
            <button onClick={() => onStep(1)}>
              Next <ArrowRight />
            </button>
          </div>
        </section>

        <CaseNotesPanel
          item={item}
          note={progress.note}
          onNoteChange={onNoteChange}
          groupMate={groupMate ?? null}
          onCompare={() => setComparing(true)}
        />
      </div>

      {comparing && groupMate && (
        <CompareDialog cases={[item, groupMate]} onClose={() => setComparing(false)} />
      )}
    </>
  );
}

function BuiltInSource({ variant }: { variant: BuiltInVariant }) {
  const jpermLink = (text: string) => (
    <a href={JPERM_URL} target="_blank" rel="noreferrer">
      {text} <ExternalLink />
    </a>
  );
  if (variant.source === 'jperm') return <b>Imported from {jpermLink('JPerm')}</b>;
  if (variant.listing === null) return <b>Curated default</b>;
  return <b>Curated default, also listed as {jpermLink(`JPerm ${variant.listing}`)}</b>;
}
