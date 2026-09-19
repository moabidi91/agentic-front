import type { PromptRef } from '../api/types';

/** Dropdown shown above the composer while typing "/…" — picks from the session's loaded prompts. */
export function SlashCommandMenu({
  items,
  activeIndex,
  onHover,
  onSelect,
}: {
  items: PromptRef[];
  activeIndex: number;
  onHover: (i: number) => void;
  onSelect: (p: PromptRef) => void;
}) {
  return (
    <div
      className="af-card"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: '100%',
        marginBottom: 8,
        maxHeight: 220,
        overflowY: 'auto',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 30,
        padding: 6,
      }}
    >
      <div
        style={{
          padding: '4px 8px 6px',
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--text-3)',
        }}
      >
        Prompts
      </div>
      {items.length === 0 ? (
        <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-3)' }}>No matching prompt.</div>
      ) : (
        items.map((p, i) => (
          <button
            key={p.name}
            type="button"
            onMouseEnter={() => onHover(i)}
            onClick={() => onSelect(p)}
            style={{
              width: '100%',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              padding: '8px 10px',
              borderRadius: 8,
              border: 'none',
              background: i === activeIndex ? 'var(--surface-2)' : 'none',
            }}
          >
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>/{p.name}</span>
            <span
              style={{
                fontSize: 10.5,
                color: 'var(--text-3)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {p.content.trim().slice(0, 80) || 'Empty prompt'}
            </span>
          </button>
        ))
      )}
    </div>
  );
}
