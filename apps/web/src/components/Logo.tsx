const LETTERS = [
  { ch: 'G', color: '#ffc93c', tilt: -6 },
  { ch: 'r', color: '#ff8a2b', tilt: 4 },
  { ch: 'i', color: '#f04a4a', tilt: -3 },
  { ch: 'd', color: '#a15cf0', tilt: 5 },
  { ch: 'z', color: '#2fd3e8', tilt: -5 },
  { ch: 'y', color: '#3dcb5c', tilt: 4 },
];

/** Original Gridzy wordmark: chunky, multicolor, slightly bouncy letters. */
export function Logo() {
  return (
    <h1 className="logo" aria-label="Gridzy">
      {LETTERS.map((l, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="logo-letter"
          style={{ color: l.color, rotate: `${l.tilt}deg`, animationDelay: `${i * 0.12}s` }}
        >
          {l.ch}
        </span>
      ))}
    </h1>
  );
}
