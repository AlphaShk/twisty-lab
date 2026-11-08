import { LEARNING_STATUSES, statusLabel, type LearningStatus } from '../progress';

type StatusPickerProps = {
  value: LearningStatus;
  onChange: (status: LearningStatus) => void;
  compact?: boolean;
};

export function StatusPicker({ value, onChange, compact = false }: StatusPickerProps) {
  return (
    <div
      className={`status-picker ${compact ? 'compact' : ''}`}
      role="group"
      aria-label="Learning status"
    >
      {LEARNING_STATUSES.map((status) => (
        <button
          className={`${status} ${value === status ? 'active' : ''}`}
          aria-pressed={value === status}
          onClick={(event) => {
            event.stopPropagation();
            onChange(status);
          }}
          key={status}
        >
          {statusLabel[status]}
        </button>
      ))}
    </div>
  );
}
