import { Spinner } from "./Skeleton";

function initials(name) {
  return (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

// Small deterministic hue from the userId so each person's avatar keeps a
// stable color across reconnects/sessions without a full palette lookup.
function colorFor(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return `hsl(${hash % 360}, 65%, 55%)`;
}

export default function PresenceBar({ onlineUsers, connected }) {
  return (
    <div className="presence-bar">
      {connected ? (
        <span className="connection-dot connection-dot--on" />
      ) : (
        <Spinner size={11} className="presence-bar__spinner" />
      )}
      <span className="presence-bar__label">{connected ? "Live" : "Reconnecting…"}</span>
      <div className="presence-bar__avatars">
        {onlineUsers.map((u) => (
          <div
            key={u.userId}
            className="presence-avatar"
            style={{ background: colorFor(u.userId) }}
            title={u.userName}
          >
            {initials(u.userName)}
          </div>
        ))}
      </div>
    </div>
  );
}
