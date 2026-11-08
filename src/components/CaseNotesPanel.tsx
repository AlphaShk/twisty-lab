import { ChevronRight, ShieldCheck, Sparkles } from 'lucide-react';
import type { OllCase } from '../data';

type CaseNotesPanelProps = {
  item: OllCase;
  note: string;
  onNoteChange: (note: string) => void;
  /** Another case of the same shape group, offered for side-by-side comparison. */
  groupMate: OllCase | null;
  onCompare: () => void;
};

export function CaseNotesPanel({
  item,
  note,
  onNoteChange,
  groupMate,
  onCompare,
}: CaseNotesPanelProps) {
  return (
    <aside className="insight-panel tools-panel">
      <div className="insight-heading">
        <p className="eyebrow">CASE NOTES</p>
        <h2>Recognition & tools</h2>
      </div>
      <div className="memory-card accent">
        <span>Recognition cue</span>
        <b>“{item.cue}”</b>
        <p>{item.hint}</p>
      </div>
      <div className="memory-card note-card">
        <span>Your note</span>
        <textarea
          aria-label="Personal note"
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="Add a finger-trick, grip, or recognition cue…"
        />
        <small>Saved on this device</small>
      </div>
      <div className="rules-card">
        <span>
          <ShieldCheck /> Verification rules
        </span>
        <ul>
          <li>All top stickers oriented</li>
          <li>First two layers preserved</li>
          <li>Any U turn first, any PLL and final AUF accepted</li>
        </ul>
      </div>
      {groupMate && (
        <button className="confusion-card" onClick={onCompare}>
          <span>
            <Sparkles /> Similar case
          </span>
          <b>Compare with OLL {groupMate.number}</b>
          <small>
            Same shape family <ChevronRight />
          </small>
        </button>
      )}
    </aside>
  );
}
