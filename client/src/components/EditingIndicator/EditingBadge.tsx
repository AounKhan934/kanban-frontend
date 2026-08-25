interface EditingBadgeProps {
  editors: { userId: string; userName: string }[];
}

/**
 * Purely informational — this is NOT a lock. Multiple users (including
 * "you" via another tab) may be editing the same card at once; this just
 * tells you who else has it open right now.
 */
export function EditingBadge({ editors }: EditingBadgeProps) {
  if (editors.length === 0) return null;

  const text =
    editors.length === 1
      ? `👤 ${editors[0].userName} is editing…`
      : `👤 ${editors.length} people editing…`;

  return (
    <div className="kanban-editing-badge" data-testid="editing-badge">
      {text}
    </div>
  );
}

