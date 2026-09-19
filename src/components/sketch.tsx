import type { CSSProperties, ReactNode } from 'react';

/**
 * Shared hand-sketched / whiteboard styling primitives — used by the State
 * machine reference (StateMachineContent) and the first-run guide carousel
 * (ConnectingScreen), so both read as the same drawn-by-hand system rather
 * than two separate looks.
 */

export const HAND_FONT = "'Kalam', var(--font-sans)";

// Small alternating tilt + irregular corner-radius set per card index, for the sketched feel.
const TILTS = [-1.4, 1.1, -0.9, 1.5, -1.2, 0.8, -1.6, 1.3];
const RADII = ['10px 15px 9px 16px', '15px 9px 16px 10px', '9px 16px 10px 14px', '16px 10px 14px 9px'];

export function sketchStyle(i: number): CSSProperties {
  return {
    transform: `rotate(${TILTS[i % TILTS.length]}deg)`,
    borderRadius: RADII[i % RADII.length],
  };
}

export function HandHeading({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        fontFamily: HAND_FONT,
        fontSize: 16,
        fontWeight: 700,
        color: 'var(--text)',
        marginBottom: 10,
        transform: 'rotate(-0.6deg)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** One numbered step — a sticky-note-ish card, no connecting arrow. */
export function StepNote({
  index,
  label,
  tone = 'neutral',
}: {
  index: number;
  label: string;
  tone?: 'neutral' | 'info' | 'success' | 'danger';
}) {
  const map = {
    neutral: { bg: 'var(--surface)', fg: 'var(--text)', border: 'var(--border)' },
    info: { bg: 'var(--blue)22', fg: 'var(--blue)', border: 'var(--blue)' },
    success: { bg: 'var(--green-soft)', fg: 'var(--green)', border: 'var(--green)' },
    danger: { bg: 'var(--red-soft)', fg: 'var(--red)', border: 'var(--red)' },
  }[tone];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '8px 14px 8px 10px',
        border: `1.6px dashed ${map.border}`,
        background: map.bg,
        ...sketchStyle(index),
      }}
    >
      <span
        style={{
          width: 20,
          height: 20,
          flexShrink: 0,
          borderRadius: '50%',
          border: `1.4px solid ${map.fg}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: HAND_FONT,
          fontSize: 12,
          fontWeight: 700,
          color: map.fg,
        }}
      >
        {index + 1}
      </span>
      <span style={{ fontSize: 11.5, fontWeight: 700, fontFamily: 'var(--font-mono)', color: map.fg }}>{label}</span>
    </div>
  );
}
