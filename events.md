# Socket Event Contract

## Conventions

- Every **write** event sent by the client (`card:create`, `card:update`, `card:move`, `card:delete`) includes a client-generated `operationId` (UUID).
- The server echoes that same `operationId` back on the corresponding response — success (`card:created` / `card:updated` / `card:moved` / `card:deleted`) or failure (`operation:rejected`). This is how the client matches a server response to the specific optimistic change it needs to confirm or roll back.
- `boardId` scopes every event to a Socket.IO room. A client must have sent `board:join` for that room before sending any write event.

---

## Client → Server

### board:join
Purpose:
Join a board room.
Payload:
```json
{
  "boardId": "board-123"
}
```
Server response: `board:state`

---

### card:create
Payload:
```json
{
  "operationId": "op-abc123",
  "boardId": "board-123",
  "columnId": "column-1",
  "title": "Build login",
  "description": "Create login page"
}
```
Server response: `card:created` or `operation:rejected`

---

### card:update
Payload:
```json
{
  "operationId": "op-abc124",
  "boardId": "board-123",
  "cardId": "card-123",
  "title": "Updated title",
  "description": "Updated description",
  "version": 3
}
```
Server response: `card:updated` or `operation:rejected`

---

### card:move
Payload:
```json
{
  "operationId": "op-abc125",
  "boardId": "board-123",
  "cardId": "card-123",
  "fromColumnId": "todo",
  "toColumnId": "done",
  "position": 2,
  "version": 4
}
```
Server response: `card:moved` or `operation:rejected`

Note: `fromColumnId` is for client-side animation only (e.g. animating the card out of its old column). The server does not need it — `moveCard()` only requires `cardId`, `toColumnId`, `position`, and `version`.

---

### card:delete
Payload:
```json
{
  "operationId": "op-abc126",
  "boardId": "board-123",
  "cardId": "card-123",
  "version": 5
}
```
Server response: `card:deleted` or `operation:rejected`

---

### card:editing:start
Payload:
```json
{
  "boardId": "board-123",
  "cardId": "card-123"
}
```
Not a write event — no `operationId`, no rejection path.

---

### card:editing:stop
Payload:
```json
{
  "boardId": "board-123",
  "cardId": "card-123"
}
```
Not a write event — no `operationId`, no rejection path.

---

## Server → Client

### board:state
Sent in response to `board:join`, and again after `board:resync`.
```json
{
  "board": {},
  "columns": [],
  "cards": [],
  "boardVersion": 12
}
```
`boardVersion` is a board-level counter, incremented on every successful write to the board (create/update/move/delete of any column or card). It is separate from each card's own `version`. Its purpose: after a reconnect, a client can compare the `boardVersion` it last saw against the current one to know whether it missed events, without having to compare every card individually.

---

### card:created
```json
{
  "operationId": "op-abc123",
  "card": {}
}
```

---

### card:updated
```json
{
  "operationId": "op-abc124",
  "card": {}
}
```
The card's `version` lives inside the nested `card` object (`card.version`) — not duplicated at the top level.

---

### card:moved
```json
{
  "operationId": "op-abc125",
  "cardId": "...",
  "columnId": "...",
  "position": 3,
  "version": 4
}
```

---

### card:deleted
```json
{
  "operationId": "op-abc126",
  "cardId": "...",
  "version": 5
}
```

---

### presence:update
Broadcast whenever a user joins or leaves a board room.
```json
{
  "users": [
    { "userId": "u-1", "userName": "Alex" },
    { "userId": "u-2", "userName": "Sam" }
  ]
}
```

---

### card:editing:started
```json
{
  "cardId": "...",
  "userId": "...",
  "userName": "..."
}
```

### card:editing:stopped
```json
{
  "cardId": "...",
  "userId": "...",
  "userName": "..."
}
```
Replaces the single ambiguous `card:editing` event — the client now knows directly from the event name whether editing started or stopped, instead of needing an extra field to disambiguate.

---

### operation:rejected
```json
{
  "operationId": "...",
  "reason": "VERSION_CONFLICT"
}
```
`reason` is one of:
- `VERSION_CONFLICT` — the version sent by the client no longer matches the current server version.
- `CARD_NOT_FOUND` — the card doesn't exist (e.g. already deleted by someone else).
- `COLUMN_NOT_FOUND` — the target column in a `card:move` doesn't exist.
- `BOARD_NOT_FOUND` — the board doesn't exist.

On any rejection, the client should discard its optimistic change for that `operationId` and re-render from the current server state (see `board:resync` below if the drift is larger than one operation).

---

### board:resync
```json
{
  "boardId": "..."
}
```
Sent by the server to a specific client when it detects that client's state may be stale beyond what a single `operation:rejected` can fix (e.g. the client was disconnected and missed multiple events). On receiving this, the client re-emits `board:join` for the same `boardId`, which triggers a fresh `board:state` response — the same full-resync path used on initial join.[3:46 PM]ye events.md update krde