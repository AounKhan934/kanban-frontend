import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CardData, ColumnData } from '../../types';
import { SortableCard } from './SortableCard';

interface ColumnProps {
  column: ColumnData;
  cards: CardData[]; // already sorted by position, ascending
  editingByCard: Record<string, { userId: string; userName: string }[]>;
  onOpenCard: (cardId: string) => void;
}

export function Column({ column, cards, editingByCard, onOpenCard }: ColumnProps) {
  const { setNodeRef } = useDroppable({ id: column.id });

  return (
    <div className="kanban-column" ref={setNodeRef} data-testid={`column-${column.id}`}>
      <h3 className="kanban-column-title">{column.name}</h3>
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="kanban-column-cards">
          {cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              editors={editingByCard[card.id] ?? []}
              onOpen={onOpenCard}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
