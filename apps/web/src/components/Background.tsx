import type { CSSProperties } from 'react';

/** Soft, slowly drifting squares behind everything. Fixed layout, so it never reflows. */
const SQUARES = [
  { x: 6, y: 12, size: 70, color: '#7aa2ff', dur: 26, delay: -3 },
  { x: 78, y: 8, size: 54, color: '#c08bff', dur: 31, delay: -12 },
  { x: 88, y: 46, size: 90, color: '#5fd7ff', dur: 35, delay: -7 },
  { x: 14, y: 62, size: 46, color: '#ffd76a', dur: 29, delay: -18 },
  { x: 52, y: 84, size: 80, color: '#ff8ad8', dur: 38, delay: -5 },
  { x: 36, y: 30, size: 38, color: '#8affc1', dur: 24, delay: -14 },
  { x: 66, y: 66, size: 50, color: '#7aa2ff', dur: 33, delay: -21 },
  { x: 2, y: 90, size: 64, color: '#c08bff', dur: 28, delay: -9 },
];

export function Background() {
  return (
    <div className="background" aria-hidden="true">
      {SQUARES.map((s, i) => (
        <span
          key={i}
          className="bg-square"
          style={
            {
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
              background: s.color,
              animationDuration: `${s.dur}s`,
              animationDelay: `${s.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
