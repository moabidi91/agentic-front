import { useMemo, useState } from 'react';

export interface SelectableListItem {
  id: string;
  label: string;
}

/**
 * A searchable, checkable review list — used once a chip row gets too crowded
 * to scan at a glance (many selected skills or prompts). Every row here is
 * already selected; unchecking one removes it via onRemove, same action as
 * the chip's "x".
 */
export function SelectableList({
  items,
  onRemove,
  searchPlaceholder = 'Filter…',
  maxHeight = 200,
  searchThreshold = 6,
}: {
  items: SelectableListItem[];
  onRemove: (id: string) => void;
  searchPlaceholder?: string;
  maxHeight?: number;
  searchThreshold?: number;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.label.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div className="af-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {items.length > searchThreshold && (
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          style={{
            border: 'none',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface-2)',
            padding: '8px 12px',
            fontSize: 12,
            color: 'var(--text)',
            outline: 'none',
          }}
        />
      )}
      <div style={{ maxHeight, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '10px 12px', fontSize: 11.5, color: 'var(--text-3)' }}>No match.</div>
        ) : (
          filtered.map((item, i) => (
            <label
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '7px 12px',
                fontSize: 12.5,
                fontWeight: 600,
                color: 'var(--text)',
                cursor: 'pointer',
                borderTop: i > 0 ? '1px solid var(--border)' : 'none',
              }}
            >
              <input
                type="checkbox"
                checked
                onChange={() => onRemove(item.id)}
                style={{ width: 14, height: 14, accentColor: 'var(--navy)', flexShrink: 0 }}
              />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
