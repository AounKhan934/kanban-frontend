export type CardStatus = "idle" | "pending" | "rejected";

export type Card = {
  id: string;
  title: string;
  description: string;
  columnId: string;
  version: number;
  status?: CardStatus;
};

export type Column = {
  id: string;
  title: string;
  cards: Card[];
};

export type Board = {
  id: string;
  title: string;
  columns: Column[];
  boardVersion: number;
};

