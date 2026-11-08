import { CircleHelp, X } from 'lucide-react';
import type { OllCase } from '../data';
import { displayAlg } from '../notation';
import { CaseImage } from './CaseImage';

export function CompareDialog({ cases, onClose }: { cases: OllCase[]; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="compare-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Compare similar OLL cases"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">SIMILAR CASES</p>
            <h2>Spot the difference</h2>
          </div>
          <button aria-label="Close comparison" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="compare-grid">
          {cases.map((item) => (
            <div className="compare-case" key={item.number}>
              <CaseImage item={item} />
              <span>OLL {item.number}</span>
              <h3>{item.cue}</h3>
              <p>{item.hint}</p>
              <code>{displayAlg(item.algorithm)}</code>
            </div>
          ))}
        </div>
        <div className="compare-tip">
          <CircleHelp />
          <span>Use side stickers to separate cases that share a similar top silhouette.</span>
        </div>
      </section>
    </div>
  );
}
