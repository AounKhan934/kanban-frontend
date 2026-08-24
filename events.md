# Socket.IO Event Contract (PROPOSED DRAFT — Member 4)

> This file is a **draft** written to satisfy the Member 4 responsibilities.
> Per team rules, this must be reviewed and agreed by the whole team before
> it becomes the real `events.md`. Do not silently overwrite an existing
> `events.md` with this one.

All events are scoped to a single `boardId`. Clients join a Socket.IO room
named `board:{boardId}` after emitting `board:join`.

## Client → Server

### `board:join`
```json
{ "boardId": "board-1", "userId": "u1", "userName": "Abdullah" }
```
Server responds with `board:state` (full snapshot) and broadcasts
`presence:update` to the room.

### `board:leave`
```json
{ "boardId": "board-1" }
```

### `board:resync`
```json
{ "boardId": "board-1" }
```
Requested by the client after reconnecting. Server responds with a fresh
`board:state`.

### `card:move`
```json
{
  "operationId": "uuid-v4",
  "boardId": "board-1",
  "cardId": "card-123",
  "fromColumnId": "todo",
  "toColumnId": "done",
  "position": 2500,
  "version": 4
}
```
- `position` is a float used for ordering within `toColumnId` (gap-based,
  not an array index).
- `version` is the client's last-known version of the card, used by the
  server for optimistic-concurrency conflict detection.

### `card:editing:start`
```json
{ "boardId": "board-1", "cardId": "card-123", "userId": "u1", "userName": "Abdullah" }
```

### `card:editing:stop`
```json
{ "boardId": "board-1", "cardId": "card-123", "userId": "u1" }
```

## Server → Client

### `board:state`
Full snapshot, sent on join and on resync.
```json
{
  "boardId": "board-1",
  "columns": [{ "id": "todo", "name": "Todo" }, { "id": "done", "name": "Done" }],
  "cards": [
    { "id": "card-123", "title": "Fix authentication", "columnId": "todo", "position": 1000, "version": 3 }
  ]
}
```

### `card:moved`
Broadcast to the room (including the sender) once a move is persisted.
```json
{
  "operationId": "uuid-v4",
  "cardId": "card-123",
  "columnId": "done",
  "position": 2500,
  "version": 5,
  "movedBy": "u1"
}
```
The sender uses `operationId` to reconcile/remove its pending optimistic
operation. Other clients use `cardId`/`columnId`/`position` to apply the
move.

### `operation:rejected`
```json
{
  "operationId": "uuid-v4",
  "reason": "VERSION_CONFLICT",
  "message": "Card was changed by another user. Board synchronized.",
  "latestVersion": 6
}
```
`reason` is one of: `VERSION_CONFLICT`, `CARD_NOT_FOUND`, `INVALID_COLUMN`,
`UNKNOWN`. The client rolls back the optimistic change (or, on
`VERSION_CONFLICT` / `CARD_NOT_FOUND`, requests a resync).

### `card:created`
```json
{ "card": { "id": "card-456", "title": "New card", "columnId": "todo", "position": 3000, "version": 1 } }
```

### `card:deleted`
```json
{ "cardId": "card-123" }
```

### `card:editing`
Broadcast whenever any user's editing state changes on a card.
```json
{ "cardId": "card-123", "userId": "u2", "userName": "Sara", "isEditing": true }
```

### `presence:update`
Full authoritative list of users currently viewing the board.
```json
{
  "boardId": "board-1",
  "users": [{ "id": "u1", "name": "Abdullah" }, { "id": "u2", "name": "Sara" }]
}
```

### `error`
```json
{ "message": "Something went wrong." }
```
