import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'md' | 'sm';
}

export function Button({ variant = 'secondary', size = 'md', className = '', ...rest }: ButtonProps) {
  const cls = ['af-btn', `af-btn--${variant}`, size === 'sm' ? 'af-btn--sm' : '', className].filter(Boolean).join(' ');
  return <button className={cls} {...rest} />;
}
