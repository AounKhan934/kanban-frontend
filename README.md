# kanban-frontend

React + Vite frontend built to match the backend in `kanban-backend`
(Express + MongoDB REST API, Socket.IO realtime layer) exactly as
implemented — read from the actual route/socket handler code, not just
`events.md`.

## Setup

```bash
npm install
cp .env.example .env
# edit .env if your backend isn't on localhost:5000
npm run dev
```

Opens on `http://localhost:5173`.

## How it matches the backend

- **Boards** — REST only (`GET /boards`, `POST /boards`). Listed/created on
  the landing screen.
- **Columns** — REST only. The backend's `events.md` and socket handlers
  have no column events, so column create/rename/delete go through
  `PATCH/POST/DELETE /columns` and then trigger a `board:resync` so your
  own view picks up the change immediately. (Other connected clients will
  see it on their next join/resync — the backend doesn't broadcast column
  changes over the socket.)
- **Cards** — Socket.IO only, per `events.md`: `card:create`,
  `card:update`, `card:delete`, `card:move`, each carrying a client-generated
  `operationId` so the UI can reconcile its own optimistic change with the
  server's broadcast, or roll it back on `operation:rejected`.
- **IDs** — the backend uses MongoDB, so `_id` is the id field everywhere
  (not `id`) — the frontend reads `_id` throughout.
- **Card positions** — `card:create`'s payload has no `position` field
  (matches the backend's `card.service.js`, which appends to the end of
  the column when none is given); drag-and-drop moves compute a fractional
  position between neighbors using the same 1000-gap scheme the backend
  uses for new cards.
- **Realtime sync** — joins a board with `board:join`, replaces local state
  wholesale on every `board:state` (both the initial join and any
  `board:resync`), and re-joins automatically on reconnect rather than
  trusting stale local state.
- **Presence & editing** — `presence:update` drives the avatar bar;
  `card:editing:start/stop` around each card's edit form drives the
  "X editing…" badge via `card:editing`.
- **Conflicts** — `operation:rejected` (`VERSION_CONFLICT`, `CARD_NOT_FOUND`,
  etc.) rolls the optimistic change back, uses the `latestCard` the server
  sends where available, and shows a toast.

## Structure

```
src/
  lib/
    api.js        REST calls (boards, columns)
    socket.js      Socket.IO client singleton
    identity.js    per-browser userId/userName, operationId generator
    position.js    fractional position helper for card ordering
  hooks/
    useBoard.js    joins a board, owns all board state, exposes actions
  components/
    BoardList.jsx  landing page — list/create boards
    BoardPage.jsx  open board — columns + toolbar
    Column.jsx     column header, card list, drag/drop target, add-card form
    Card.jsx       card view/edit, drag source, editing badge
    PresenceBar.jsx
    UserBadge.jsx
    Toasts.jsx
```

## Known gaps / things to confirm with the backend team

- Column changes aren't broadcast live to other clients (see above) —
  worth raising with Member 1/2 if live column sync matters for the demo.
- No auth — `userId` is a random id persisted in `localStorage`, `userName`
  is editable free text. Fine for a class project, not for anything real.
- `.env` points at `localhost:5000` by default; swap in the deployed URL
  (see `.env.example`) for the hosted backend.
