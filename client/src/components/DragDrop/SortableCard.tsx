import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CardData } from '../../types';
import { EditingBadge } from '../EditingIndicator/EditingBadge';

interface SortableCardProps {
  card: CardData;
  editors: { userId: string; userName: string }[];
  onOpen: (cardId: string) => void;
}

export function SortableCard({ card, editors, onOpen }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="kanban-card"
      onClick={() => onOpen(card.id)}
      data-testid={`card-${card.id}`}
    >
      <div className="kanban-card-title">{card.title}</div>
      <EditingBadge editors={editors} />
    </div>
  );
}
