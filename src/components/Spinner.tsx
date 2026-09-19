export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div
      className="af-spinner"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '3px solid var(--border)',
        borderTopColor: 'var(--blue)',
        boxSizing: 'border-box',
      }}
    />
  );
}
