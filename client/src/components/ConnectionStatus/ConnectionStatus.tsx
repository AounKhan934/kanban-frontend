import { ConnectionStatus as Status } from '../../types';

const CONFIG: Record<Status, { icon: string; label: string; className: string }> = {
  connected: { icon: '🟢', label: 'Live', className: 'is-connected' },
  syncing: { icon: '🟡', label: 'Synced', className: 'is-syncing' },
  reconnecting: { icon: '🔴', label: 'Reconnecting…', className: 'is-reconnecting' },
  disconnected: { icon: '🔴', label: 'Disconnected', className: 'is-disconnected' },
};

export function ConnectionStatusBadge({ status }: { status: Status }) {
  const cfg = CONFIG[status];
  return (
    <div className={`kanban-connection-status ${cfg.className}`} data-testid="connection-status">
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
    </div>
  );
}
