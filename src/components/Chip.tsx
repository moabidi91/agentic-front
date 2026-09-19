export function Chip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span className="af-chip">
      {label}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Remove ${label}`}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
    </span>
  );
}
