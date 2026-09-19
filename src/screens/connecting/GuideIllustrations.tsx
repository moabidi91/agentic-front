import type { ReactNode } from 'react';
import { HAND_FONT, sketchStyle, StepNote } from '../../components/sketch';

/**
 * The six hand-sketched illustrations for the first-run guide carousel
 * (ConnectingScreen) — same drawn-by-hand language as the State machine
 * screen (dashed borders, tilted sticky notes, Kalam headings, no arrow
 * glyphs), one per topic from spec-fonctionnelle.md §4 "Connecting".
 */

function Sketch({ children, height = 118 }: { children: ReactNode; height?: number }) {
  return (
    <div
      style={{
        width: '100%',
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

function Bubble({ text, mine, index }: { text: string; mine?: boolean; index: number }) {
  return (
    <div
      style={{
        alignSelf: mine ? 'flex-end' : 'flex-start',
        maxWidth: '78%',
        padding: '8px 12px',
        border: `1.6px dashed ${mine ? 'var(--navy)' : 'var(--blue)'}`,
        background: mine ? 'var(--navy)' : 'var(--blue)18',
        color: mine ? '#fff' : 'var(--text)',
        fontSize: 10.5,
        fontFamily: HAND_FONT,
        ...sketchStyle(index),
      }}
    >
      {text}
    </div>
  );
}

export function GuideChat() {
  return (
    <Sketch>
      <div style={{ width: '100%', maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Bubble text="Check the latest deploy logs" mine index={0} />
        <Bubble text="Found 2 warnings — want the full trace?" index={1} />
      </div>
    </Sketch>
  );
}

export function GuideDebug() {
  return (
    <Sketch>
      <div style={{ width: '100%', maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <span
            style={{
              padding: '4px 12px',
              border: '1.6px dashed var(--navy)',
              background: 'var(--navy)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              fontFamily: HAND_FONT,
              ...sketchStyle(0),
            }}
          >
            Chat
          </span>
          <span
            style={{
              padding: '4px 12px',
              border: '1.6px dashed var(--border)',
              color: 'var(--text-2)',
              fontSize: 10,
              fontWeight: 700,
              fontFamily: HAND_FONT,
              ...sketchStyle(1),
            }}
          >
            Debug
          </span>
        </div>
        <StepNote index={0} label="t4 — completed" tone="success" />
        <StepNote index={1} label="t5 — running" tone="info" />
      </div>
    </Sketch>
  );
}

export function GuideHistory() {
  return (
    <Sketch>
      <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', width: '100%', maxWidth: 280 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)', flexShrink: 0 }} />
          <span style={{ width: 0, flexGrow: 1, borderLeft: '1.6px dashed var(--border)', margin: '4px 0' }} />
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26, paddingTop: 0 }}>
          <span style={{ fontSize: 11, fontFamily: HAND_FONT, color: 'var(--text-2)' }}>User request received</span>
          <span style={{ fontSize: 11, fontFamily: HAND_FONT, color: 'var(--text-2)' }}>Final answer received</span>
        </div>
      </div>
    </Sketch>
  );
}

function ThemeSwatch({ dark, index }: { dark?: boolean; index: number }) {
  return (
    <div
      style={{
        width: 62,
        height: 62,
        borderRadius: '50%',
        border: `1.8px dashed ${dark ? 'var(--navy)' : 'var(--amber)'}`,
        background: dark ? '#140A1C' : '#F6F4F8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...sketchStyle(index),
      }}
    >
      {dark ? (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#F1E9F5" stroke="none">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      ) : (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B1450" strokeWidth={1.8}>
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
        </svg>
      )}
    </div>
  );
}

export function GuideTheme() {
  return (
    <Sketch>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <ThemeSwatch index={0} />
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth={2}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
        <ThemeSwatch dark index={1} />
      </div>
    </Sketch>
  );
}

export function GuideStates() {
  const states = ['NEW', 'ACTIVE', 'RUNNING_PLAN', 'READY', 'COMPLETED'];
  return (
    <Sketch height={128}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {states.map((s, i) => (
            <StepNote key={s} index={i} label={s} tone={s === 'COMPLETED' ? 'success' : 'neutral'} />
          ))}
        </div>
        <span style={{ fontSize: 10, fontFamily: HAND_FONT, color: 'var(--red)' }}>
          …or INTERRUPTED, from any active state
        </span>
      </div>
    </Sketch>
  );
}

function ControlNote({ label, icon, index }: { label: string; icon: ReactNode; index: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '7px 10px',
        border: '1.6px dashed var(--border)',
        background: 'var(--surface)',
        ...sketchStyle(index),
      }}
    >
      {icon}
      <span style={{ fontSize: 10, fontWeight: 700, fontFamily: HAND_FONT, color: 'var(--text)' }}>{label}</span>
    </div>
  );
}

export function GuideControl() {
  return (
    <Sketch height={128}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%', maxWidth: 320 }}>
        <ControlNote
          index={0}
          label="Interrupt anytime"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--red)" stroke="none">
              <rect x="5" y="5" width="14" height="14" rx="2" />
            </svg>
          }
        />
        <ControlNote
          index={1}
          label="Live plan diagram"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth={2}>
              <circle cx="4" cy="6" r="2" />
              <circle cx="4" cy="18" r="2" />
              <circle cx="14" cy="12" r="2" />
              <circle cx="20" cy="6" r="2" />
              <path d="M6 7l6 4M6 17l6-4M16 11l3-4" />
            </svg>
          }
        />
        <ControlNote
          index={2}
          label="Hash-chained audit"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth={1.8}>
              <path d="M12 3l7 3v6c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V6l7-3z" />
            </svg>
          }
        />
        <ControlNote
          index={3}
          label="Name & icon, yours"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth={1.6}>
              <rect x="3" y="3" width="18" height="18" rx="5" />
            </svg>
          }
        />
      </div>
    </Sketch>
  );
}
