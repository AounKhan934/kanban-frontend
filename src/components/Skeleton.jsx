// Generic loading primitives shared by every skeleton/loading state in
// the app — a shimmering placeholder block, and a small spinner for
// inline "this is in flight" indicators (buttons, presence, etc).

export function Skeleton({ className = "", style }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

export function Spinner({ size = 16, className = "" }) {
  return (
    <span
      className={`spinner ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}
