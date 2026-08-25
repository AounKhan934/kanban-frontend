export interface UserRef {
  id: string;
  name: string;
}

export interface CardData {
  id: string;
  title: string;
  columnId: string;
  position: number;
  version: number;
}

export interface ColumnData {
  id: string;
  name: string;
}

export interface BoardState {
  boardId: string;
  columns: ColumnData[];
  cards: CardData[];
}

export interface MoveOperation {
  operationId: string;
  boardId: string;
  cardId: string;
  fromColumnId: string;
  toColumnId: string;
  position: number;
  version: number;
}

export interface PendingOperation {
  type: 'card:move';
  cardId: string;
  previousState: {
    columnId: string;
    position: number;
    version: number;
  };
  createdAt: number;
}

export interface RejectedOperationPayload {
  operationId: string;
  reason: 'VERSION_CONFLICT' | 'CARD_NOT_FOUND' | 'INVALID_COLUMN' | 'UNKNOWN';
  message?: string;
  latestVersion?: number;
}

export interface MovedPayload {
  operationId?: string;
  cardId: string;
  columnId: string;
  position: number;
  version: number;
  movedBy?: string;
}

export interface EditingPayload {
  cardId: string;
  userId: string;
  userName: string;
  isEditing: boolean;
}

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected' | 'syncing';

