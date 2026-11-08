import { Bookmark, ChevronRight, Search } from 'lucide-react';
import { preferredVariant, type AlgorithmMap } from '../algorithmState';
import { builtInAlgorithmCount, groups, type OllCase } from '../data';
import { displayAlg } from '../notation';
import { pluralize, type LearningStatus, type ProgressMap } from '../progress';
import { CaseImage } from './CaseImage';
import { Header } from './Header';
import { StatusPicker } from './StatusPicker';

export type LibraryFilters = {
  search: string;
  group: string;
  status: string;
};

export const ALL_GROUPS = 'All groups';
export const ALL_STATUSES = 'All statuses';

type LibraryProps = {
  cases: OllCase[];
  progress: ProgressMap;
  algorithms: AlgorithmMap;
  coverage: number;
  filters: LibraryFilters;
  onFiltersChange: (change: Partial<LibraryFilters>) => void;
  openCase: (number: number) => void;
  toggleBookmark: (number: number) => void;
  setLearningStatus: (number: number, status: LearningStatus) => void;
};

/** Cases matching the search text (number, group, cue or preferred algorithm) and both filters. */
export function filterCases(
  cases: OllCase[],
  filters: LibraryFilters,
  progress: ProgressMap,
  algorithms: AlgorithmMap,
) {
  const needle = filters.search.toLowerCase().trim();
  return cases.filter((item) => {
    const preferred = preferredVariant(item, algorithms[item.number]).algorithm;
    const matchesSearch =
      !needle ||
      `${item.number}`.includes(needle) ||
      item.group.toLowerCase().includes(needle) ||
      item.cue.toLowerCase().includes(needle) ||
      preferred.toLowerCase().includes(needle);
    const matchesStatus =
      filters.status === ALL_STATUSES || progress[item.number].status === filters.status;
    const matchesGroup = filters.group === ALL_GROUPS || item.group === filters.group;
    return matchesSearch && matchesStatus && matchesGroup;
  });
}

export function LibraryView({
  cases,
  progress,
  algorithms,
  coverage,
  filters,
  onFiltersChange,
  openCase,
  toggleBookmark,
  setLearningStatus,
}: LibraryProps) {
  return (
    <>
      <Header eyebrow="OLL REFERENCE" title="Algorithm library" coverage={coverage} />
      <div className="library-page">
        <div className="library-intro">
          <div>
            <h2>All 57 OLL cases</h2>
            <p>
              Set each learning state here, then open a case to inspect, simulate, or customize its
              algorithms.
            </p>
          </div>
          <div className="library-stat">
            <span>Built-in algorithms</span>
            <b>{builtInAlgorithmCount}</b>
          </div>
        </div>
        <div className="filter-bar">
          <label className="search-box">
            <Search />
            <input
              value={filters.search}
              onChange={(event) => onFiltersChange({ search: event.target.value })}
              placeholder="Search OLL, group, cue, or algorithm"
              aria-label="Search cases"
            />
          </label>
          <select
            value={filters.group}
            onChange={(event) => onFiltersChange({ group: event.target.value })}
            aria-label="Filter by shape group"
          >
            <option>{ALL_GROUPS}</option>
            {groups.map((group) => (
              <option key={group}>{group}</option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(event) => onFiltersChange({ status: event.target.value })}
            aria-label="Filter by learning status"
          >
            <option>{ALL_STATUSES}</option>
            <option value="unlearned">Unlearned</option>
            <option value="learning">Learning</option>
            <option value="learned">Learned</option>
          </select>
          <span className="result-count">{pluralize(cases.length, 'case')}</span>
        </div>
        <div className="case-grid">
          {cases.map((item) => (
            <CaseCard
              key={item.number}
              item={item}
              progress={progress}
              algorithms={algorithms}
              openCase={openCase}
              toggleBookmark={toggleBookmark}
              setLearningStatus={setLearningStatus}
            />
          ))}
        </div>
        {cases.length === 0 && (
          <div className="empty-state">
            <Search />
            <h3>No matching cases</h3>
            <p>Try a case number, a shape name, or one of the moves.</p>
          </div>
        )}
      </div>
    </>
  );
}

type CaseCardProps = Pick<
  LibraryProps,
  'progress' | 'algorithms' | 'openCase' | 'toggleBookmark' | 'setLearningStatus'
> & { item: OllCase };

function CaseCard({
  item,
  progress,
  algorithms,
  openCase,
  toggleBookmark,
  setLearningStatus,
}: CaseCardProps) {
  const caseAlgorithms = algorithms[item.number];
  const { bookmarked, status } = progress[item.number];
  const verified = caseAlgorithms.alternatives.filter((custom) => custom.verifiedAt).length;
  const alternatives = item.jpermAlternatives.length + caseAlgorithms.alternatives.length;
  return (
    <article className={`case-card status-${status}`} onClick={() => openCase(item.number)}>
      <div className="card-top">
        <span>OLL {item.number}</span>
        <button
          aria-label={`Bookmark OLL ${item.number}`}
          aria-pressed={bookmarked}
          className={bookmarked ? 'bookmarked' : ''}
          onClick={(event) => {
            event.stopPropagation();
            toggleBookmark(item.number);
          }}
        >
          <Bookmark />
        </button>
      </div>
      <CaseImage item={item} />
      <div className="card-copy">
        <small>{item.group}</small>
        <h3>{item.cue}</h3>
        <code>{displayAlg(preferredVariant(item, caseAlgorithms).algorithm)}</code>
        <StatusPicker
          compact
          value={status}
          onChange={(next) => setLearningStatus(item.number, next)}
        />
      </div>
      <div className="card-footer">
        <span>
          {pluralize(alternatives, 'alternative')}
          {verified ? ` · ${verified} verified` : ''}
        </span>
        <button
          className="open-case"
          aria-label={`Open OLL ${item.number}`}
          onClick={(event) => {
            event.stopPropagation();
            openCase(item.number);
          }}
        >
          Open <ChevronRight />
        </button>
      </div>
    </article>
  );
}
