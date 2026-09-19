import type { ReactNode } from 'react';

export function Badge({
  children,
  bg,
  color,
  dot,
}: {
  children: ReactNode;
  bg: string;
  color: string;
  dot?: boolean;
}) {
  return (
    <span className="af-badge" style={{ background: bg, color }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />}
      {children}
    </span>
  );
}
