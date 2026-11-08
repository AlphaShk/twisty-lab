import type { OllCase } from '../data';

export function CaseImage({ item, compact = false }: { item: OllCase; compact?: boolean }) {
  return (
    <div className={`case-image-wrap ${compact ? 'compact' : ''}`}>
      <img
        src={item.image}
        alt={`OLL ${item.number} top view`}
        width={120}
        height={120}
        loading="lazy"
        draggable="false"
      />
    </div>
  );
}
