import { Box } from 'lucide-react';
import type { Phrase } from '../notation';

type PhrasePickerProps = {
  phrases: Phrase[];
  /** Index of the phrase being played on its own, or null for the full algorithm. */
  active: number | null;
  onChange: (index: number | null) => void;
};

export function PhrasePicker({ phrases, active, onChange }: PhrasePickerProps) {
  return (
    <div className="chunk-panel workbench-chunks">
      <div className="chunk-heading">
        <span>Move phrases</span>
        <small>
          {phrases.length
            ? 'Pick a phrase to play it on its own'
            : 'Phrases appear once the notation parses'}
        </small>
      </div>
      {phrases.length > 0 && (
        <div className="chunk-row" role="group" aria-label="Move phrases">
          <button
            className={active === null ? 'active' : ''}
            aria-pressed={active === null}
            onClick={() => onChange(null)}
          >
            <span>
              <Box />
            </span>
            <code>Full algorithm</code>
          </button>
          {phrases.map((phrase, index) => (
            <button
              className={active === index ? 'active' : ''}
              aria-pressed={active === index}
              onClick={() => onChange(active === index ? null : index)}
              key={`${index}-${phrase.moves}`}
            >
              <span>{index + 1}</span>
              <code>{phrase.label}</code>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
