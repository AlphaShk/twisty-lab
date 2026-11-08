import { Bookmark, ChevronRight, CircleHelp, Sparkles, Target } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { AlgorithmMap } from '../algorithmState';
import { groups, ollCases } from '../data';
import { pluralize, type ProgressMap } from '../progress';
import { CaseImage } from './CaseImage';
import { Header } from './Header';

type ProgressViewProps = {
  progress: ProgressMap;
  algorithms: AlgorithmMap;
  coverage: number;
  openCase: (number: number) => void;
};

const LEARNING_LIST_LENGTH = 7;

export function ProgressView({ progress, algorithms, coverage, openCase }: ProgressViewProps) {
  const entries = Object.values(progress);
  const learnedCount = entries.filter((item) => item.status === 'learned').length;
  const learningCount = entries.filter((item) => item.status === 'learning').length;
  const bookmarked = entries.filter((item) => item.bookmarked).length;
  const customs = Object.values(algorithms).flatMap((item) => item.alternatives);
  const verifiedCount = customs.filter((custom) => custom.verifiedAt).length;
  const groupStats = groups
    .map((group) => {
      const cases = ollCases.filter((item) => item.group === group);
      const learned = cases.filter((item) => progress[item.number].status === 'learned').length;
      return { group, count: cases.length, score: Math.round((learned / cases.length) * 100) };
    })
    .sort((a, b) => b.score - a.score);
  const learningCases = ollCases.filter((item) => progress[item.number].status === 'learning');

  return (
    <>
      <Header eyebrow="YOUR NOTEBOOK" title="Learning progress" coverage={coverage} />
      <div className="progress-page">
        <section className="progress-hero">
          <div>
            <p className="eyebrow">OLL COMPLETION</p>
            <strong>{coverage}%</strong>
            <p>{learnedCount} of 57 cases are marked learned.</p>
          </div>
          <div
            className="mastery-orbit"
            style={{ '--score': `${coverage * 3.6}deg` } as CSSProperties}
          >
            <span>
              {coverage}%<small>learned</small>
            </span>
          </div>
        </section>
        <div className="stat-grid four-stats">
          <div>
            <Target />
            <span>Learned</span>
            <b>
              {learnedCount}
              <small>/57</small>
            </b>
          </div>
          <div>
            <Sparkles />
            <span>Learning</span>
            <b>{learningCount}</b>
          </div>
          <div>
            <CircleHelp />
            <span>Unlearned</span>
            <b>{ollCases.length - learnedCount - learningCount}</b>
          </div>
          <div>
            <Bookmark />
            <span>Bookmarked</span>
            <b>{bookmarked}</b>
          </div>
        </div>
        <div className="progress-columns">
          <section className="group-progress">
            <div className="section-heading">
              <div>
                <p className="eyebrow">BY SHAPE</p>
                <h2>Learned by group</h2>
              </div>
              <span>{groups.length} families</span>
            </div>
            <div className="group-bars">
              {groupStats.map((item) => (
                <div className="group-bar" key={item.group}>
                  <div>
                    <b>{item.group}</b>
                    <span>{pluralize(item.count, 'case')}</span>
                  </div>
                  <div className="bar-track">
                    <i style={{ width: `${item.score}%` }} />
                  </div>
                  <strong>{item.score}%</strong>
                </div>
              ))}
            </div>
          </section>
          <section className="review-list">
            <div className="section-heading">
              <div>
                <p className="eyebrow">IN PROGRESS</p>
                <h2>Learning now</h2>
              </div>
              <span>{learningCases.length}</span>
            </div>
            {learningCases.slice(0, LEARNING_LIST_LENGTH).map((item) => (
              <button key={item.number} onClick={() => openCase(item.number)}>
                <CaseImage item={item} compact />
                <span>
                  <b>OLL {item.number}</b>
                  <small>
                    {pluralize(
                      1 +
                        item.jpermAlternatives.length +
                        algorithms[item.number].alternatives.length,
                      'available algorithm',
                    )}
                  </small>
                </span>
                <ChevronRight />
              </button>
            ))}
            {!learningCases.length && (
              <div className="mini-empty">
                <Sparkles />
                <p>Cases marked Learning will appear here for quick access.</p>
              </div>
            )}
          </section>
        </div>
        <div className="progress-footnote">
          {pluralize(customs.length, 'custom algorithm')} · {verifiedCount} simulator-verified
        </div>
      </div>
    </>
  );
}
