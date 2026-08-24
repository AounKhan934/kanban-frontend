import { UserRef } from '../../types';
import { Avatar } from './Avatar';

interface PresenceBarProps {
  users: UserRef[];
}

export function PresenceBar({ users }: PresenceBarProps) {
  return (
    <div className="kanban-presence" data-testid="presence-bar">
      <span className="kanban-presence-label">Viewing now:</span>
      <div className="kanban-presence-avatars">
        {users.map((u) => (
          <Avatar key={u.id} name={u.name} />
        ))}
        {users.length === 0 && <span className="kanban-presence-empty">Just you</span>}
      </div>
    </div>
  );
}
