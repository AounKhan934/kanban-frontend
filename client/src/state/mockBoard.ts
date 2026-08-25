import type { Board } from "../types/board";

export const mockBoard: Board = {
  id: "board-1",
  title: "My Kanban Board",
  boardVersion: 1,
  columns: [
    {
      id: "todo",
      title: "To Do",
      cards: [
        { id: "card-1", title: "Create login page", description: "Build the login UI", columnId: "todo", version: 1 },
        { id: "card-2", title: "Setup database", description: "Create PostgreSQL database", columnId: "todo", version: 1 },
      ],
    },
    {
      id: "in-progress",
      title: "In Progress",
      cards: [
        { id: "card-3", title: "Socket.IO setup", description: "Configure realtime connection", columnId: "in-progress", version: 1 },
      ],
    },
    {
      id: "done",
      title: "Done",
      cards: [
        { id: "card-4", title: "Create repository", description: "Setup GitHub repository", columnId: "done", version: 1 },
      ],
    },
  ],
};

