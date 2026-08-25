import { DndContext, DragOverlay, PointerSensor, closestCorners, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useMemo, useState } from 'react';
import type { BoardState, CardData } from '../../types';
import { calculatePosition } from '../../utils/position';
import { Column } from './Column';

interface BoardDndProps {
  board: BoardState;
  editingByCard: Record<string, { userId: string; userName: string }[]>;
  onOpenCard: (cardId: string) => void;
  onMove: (cardId: string, toColumnId: string, position: number) => void;
}

function cardsByColumn(board: BoardState): Record<string, CardData[]> {
  const map: Record<string, CardData[]> = {};
  for (const col of board.columns) map[col.id] = [];
  for (const card of board.cards) {
    (map[card.columnId] ??= []).push(card);
  }
  for (const colId of Object.keys(map)) {
    map[colId].sort((a, b) => a.position - b.position);
  }
  return map;
}

/**
 * Determines which column a droppable/sortable id belongs to, whether it's
 * a column id itself (dropped on empty column) or a card id (dropped over
 * another card).
 */
function resolveColumnId(id: string, grouped: Record<string, CardData[]>): string | null {
  if (grouped[id]) return id; // it's a column id
  for (const [colId, cards] of Object.entries(grouped)) {
    if (cards.some((c) => c.id === id)) return colId;
  }
  return null;
}

export function BoardDnd({ board, editingByCard, onOpenCard, onMove }: BoardDndProps) {
  const [activeCard, setActiveCard] = useState<CardData | null>(null);
  const grouped = useMemo(() => cardsByColumn(board), [board]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const card = board.cards.find((c) => c.id === event.active.id);
    setActiveCard(card ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const cardId = String(active.id);
    const overId = String(over.id);

    const toColumnId = resolveColumnId(overId, grouped);
    if (!toColumnId) return;

    const destCards = grouped[toColumnId].filter((c) => c.id !== cardId);

    // Figure out where in destCards the card was dropped: if `over` is a
    // card, insert relative to it; if `over` is the column itself (empty
    // space), append to the end.
    let insertIndex = destCards.length;
    const overIsCard = grouped[toColumnId]?.some((c) => c.id === overId);
    if (overIsCard) {
      insertIndex = destCards.findIndex((c) => c.id === overId);
      if (insertIndex === -1) insertIndex = destCards.length;
    }

    const prevCard = destCards[insertIndex - 1] ?? null;
    const nextCard = destCards[insertIndex] ?? null;
    const position = calculatePosition(prevCard?.position ?? null, nextCard?.position ?? null);

    const original = board.cards.find((c) => c.id === cardId);
    if (original && original.columnId === toColumnId && original.position === position) {
      return; // no-op drop
    }

    onMove(cardId, toColumnId, position);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban-board">
        {board.columns.map((col) => (
          <Column
            key={col.id}
            column={col}
            cards={grouped[col.id] ?? []}
            editingByCard={editingByCard}
            onOpenCard={onOpenCard}
          />
        ))}
      </div>
      <DragOverlay>
        {activeCard ? <div className="kanban-card kanban-card-overlay">{activeCard.title}</div> : null}
      </DragOverlay>
    </DndContext>
  );
}


