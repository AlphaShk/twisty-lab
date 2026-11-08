import { Check } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { initialAlgorithms, restoreAlgorithms, type CaseAlgorithms } from './algorithmState';
import type { CubeView } from './components/CubeSimulation';
import {
  ALL_GROUPS,
  ALL_STATUSES,
  filterCases,
  LibraryView,
  type LibraryFilters,
} from './components/LibraryView';
import { ProgressView } from './components/ProgressView';
import { SettingsDialog } from './components/SettingsDialog';
import { Sidebar, type View } from './components/Sidebar';
import { WindowBar } from './components/WindowBar';
import { Workbench } from './components/Workbench';
import { ollCases } from './data';
import { useStoredState } from './hooks/useStoredState';
import { isDesktop } from './links';
import {
  initialProgress,
  restoreProgress,
  statusLabel,
  type CaseProgress,
  type LearningStatus,
} from './progress';

const FIRST_CASE = 21;
const TOAST_MS = 1800;
const restoreStoredProgress = (stored: unknown) => restoreProgress(ollCases, stored);
const restoreStoredAlgorithms = (stored: unknown) => restoreAlgorithms(ollCases, stored);

function App() {
  const workspaceRef = useRef<HTMLElement>(null);
  const [view, setView] = useState<View>('library');
  const [cubeView, setCubeView] = useState<CubeView>('3D');
  const [selectedNumber, setSelectedNumber] = useState(FIRST_CASE);
  const [progress, setProgress] = useStoredState('twisty-lab-progress-v2', restoreStoredProgress);
  const [algorithmMap, setAlgorithmMap] = useStoredState(
    'twisty-lab-algorithms-v1',
    restoreStoredAlgorithms,
  );
  const [filters, setFilters] = useState<LibraryFilters>({
    search: '',
    group: ALL_GROUPS,
    status: ALL_STATUSES,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState('');

  const selected = ollCases.find((item) => item.number === selectedNumber) ?? ollCases[0];
  const learnedCount = Object.values(progress).filter((item) => item.status === 'learned').length;
  const coverage = Math.round((learnedCount / ollCases.length) * 100);
  const libraryCases = useMemo(
    () => filterCases(ollCases, filters, progress, algorithmMap),
    [algorithmMap, filters, progress],
  );

  const updateProgress = useCallback(
    (number: number, change: Partial<CaseProgress>) =>
      setProgress((current) => ({ ...current, [number]: { ...current[number], ...change } })),
    [setProgress],
  );

  const openCase = useCallback(
    (number: number) => {
      setSelectedNumber(number);
      updateProgress(number, { visited: true });
      setView('learn');
    },
    [updateProgress],
  );

  const step = useCallback(
    (direction: number) => {
      const index = ollCases.findIndex((item) => item.number === selectedNumber);
      openCase(ollCases[(index + direction + ollCases.length) % ollCases.length].number);
    },
    [openCase, selectedNumber],
  );

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), TOAST_MS);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    // Wide layouts scroll inside the workspace, narrow ones scroll the page.
    workspaceRef.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [selectedNumber, view]);

  useEffect(() => {
    if (view !== 'learn') return;
    const onKeyDown = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement | null;
      if (element?.matches('input, textarea, select')) return;
      if (event.key === 'ArrowRight') step(1);
      if (event.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [step, view]);

  function toggleBookmark(number: number) {
    updateProgress(number, { bookmarked: !progress[number].bookmarked });
  }

  function setLearningStatus(number: number, status: LearningStatus) {
    updateProgress(number, { status });
    setToast(`OLL ${number} marked ${statusLabel[status].toLowerCase()}`);
  }

  function setCaseAlgorithms(number: number, state: CaseAlgorithms) {
    setAlgorithmMap((current) => ({ ...current, [number]: state }));
  }

  function resetData() {
    const message =
      'Reset all Twisty Lab learning statuses, notes, bookmarks, and custom algorithms?';
    if (!window.confirm(message)) return;
    setProgress(initialProgress(ollCases));
    setAlgorithmMap(initialAlgorithms(ollCases));
    setSettingsOpen(false);
    setSelectedNumber(FIRST_CASE);
    setView('library');
    setToast('Local learning data reset');
  }

  return (
    <div className={`desktop-app ${isDesktop ? 'is-desktop' : 'is-web'}`}>
      {isDesktop && <WindowBar />}

      <div className="app-frame">
        <Sidebar view={view} onNavigate={setView} onOpenSettings={() => setSettingsOpen(true)} />

        <main className="workspace" ref={workspaceRef}>
          {view === 'learn' && (
            <Workbench
              key={selected.number}
              item={selected}
              progress={progress[selected.number]}
              algorithms={algorithmMap[selected.number]}
              coverage={coverage}
              cubeView={cubeView}
              onCubeViewChange={setCubeView}
              onAlgorithmsChange={(state) => setCaseAlgorithms(selected.number, state)}
              onNoteChange={(note) => updateProgress(selected.number, { note })}
              onStatusChange={(status) => setLearningStatus(selected.number, status)}
              onToggleBookmark={() => toggleBookmark(selected.number)}
              onBack={() => setView('library')}
              onStep={step}
              notify={setToast}
            />
          )}

          {view === 'library' && (
            <LibraryView
              cases={libraryCases}
              progress={progress}
              algorithms={algorithmMap}
              coverage={coverage}
              filters={filters}
              onFiltersChange={(change) => setFilters((current) => ({ ...current, ...change }))}
              openCase={openCase}
              toggleBookmark={toggleBookmark}
              setLearningStatus={setLearningStatus}
            />
          )}

          {view === 'progress' && (
            <ProgressView
              progress={progress}
              algorithms={algorithmMap}
              coverage={coverage}
              openCase={openCase}
            />
          )}
        </main>
      </div>

      {settingsOpen && (
        <SettingsDialog onClose={() => setSettingsOpen(false)} onReset={resetData} />
      )}

      {toast && (
        <div className="toast" role="status">
          <Check />
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
