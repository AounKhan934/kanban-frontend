# Member 4 Scaffold — Collaborative Kanban Board (Frontend Interaction Layer)

This is a **starter implementation** for the Member 4 role described in the
team prompt: drag-and-drop, optimistic UI, presence, "X is editing"
indicators, reconnection/resync, and concurrency-test support.

## ⚠️ Important — read before merging into the real team repo

No real team project (Board/Column/Card components, `events.md`, backend)
existed yet when this was generated, so this scaffold is **self-contained**:

- `client/` — a standalone Vite + React + TypeScript app containing only
  the Member 4 ownership folders (`DragDrop/`, `Presence/`,
  `EditingIndicator/`, `hooks/`, `tests/`) plus the minimal glue
  (`App.tsx`, `types.ts`) needed to run and demo them.
- `events.md` — a **proposed** Socket.IO event contract, written to match
  everything Part 1–13 of the Member 4 prompt requires. Treat this as a
  draft. Per the team rules ("do not modify events.md independently"),
  **do not just drop this into the real repo** — share it with the team,
  reconcile it with whatever the real `events.md` says, and only keep the
  event names/payloads the team agrees on.
- `mock-server/` — a tiny Express + Socket.IO server that implements the
  proposed contract in-memory. It exists **only** so you can run and test
  the frontend end-to-end (multi-tab presence, drag/move, reject/rollback,
  resync) before the real backend is ready. It is not meant to replace
  Member 2/3's actual server — delete it once you wire up to the real one.

When you get the real project structure, the intended integration is:
copy the contents of `client/src/components/DragDrop`,
`client/src/components/Presence`, `client/src/components/EditingIndicator`,
`client/src/hooks`, and `client/src/tests` into the matching folders of the
real client, then adapt imports (`types.ts`, socket instance, etc.) to
match what already exists there — per "adapt without unnecessarily
restructuring the project."

## Running the demo

```bash
# Terminal 1 — mock server
cd mock-server
npm install
npm start        # runs on http://localhost:4000

# Terminal 2 — frontend
cd client
npm install
npm run dev       # runs on http://localhost:5173
```

Open the app in two browser tabs/windows, each with a different name
(prompted on load), on the same `boardId` (default `board-1`), to see
presence, drag/move sync, editing indicators, and reconnection behavior.

## Running tests

```bash
cd client
npm install
npm test
```

## What's implemented

- **DragDrop/** — `dnd-kit`-based board with fractional/gap position
  calculation (never array indices), works within-column, cross-column,
  and drop-between-cards.
- **hooks/useBoardState.ts** — optimistic move + `operationId` tracking,
  rollback on `operation:rejected`, applies `card:moved` / `card:created`
  / `card:deleted` / `board:state` (resync) from the server.
- **hooks/usePresence.ts** — pure server-driven presence list.
- **hooks/useEditingIndicator.ts** — start/stop editing with cleanup on
  save/cancel/unmount/disconnect; does **not** lock cards.
- **hooks/useConnectionStatus.ts** — connect/reconnect/disconnect status +
  triggers `board:resync` on reconnect.
- **Presence/**, **EditingIndicator/**, **ConnectionStatus/** — UI
  components matching the states described in the prompt (🟢 Live /
  🔴 Reconnecting / 🟢 Synced, "Sara is editing…", avatar row).
- **tests/** — unit tests for position calculation and the optimistic
  move/rollback hook, plus a presence-rendering test.
