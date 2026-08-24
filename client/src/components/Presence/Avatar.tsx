interface AvatarProps {
  name: string;
}

const COLORS = ['#7c3aed', '#dc2626', '#059669', '#2563eb', '#d97706', '#db2777'];

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function Avatar({ name }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <div
      className="kanban-avatar"
      title={name}
      style={{ backgroundColor: colorFor(name) }}
      data-testid="presence-avatar"
    >
      {initial}
    </div>
  );
}
