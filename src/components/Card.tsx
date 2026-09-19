import type { HTMLAttributes } from 'react';

export function Card({ className = '', style, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`af-card ${className}`} style={style} {...rest} />;
}
