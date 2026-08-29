import { useCallback, useEffect, useRef, useState } from "react";
import { socket } from "../lib/socket";
import * as api from "../lib/api";
import { newOperationId } from "../lib/identity";
import { positionForInsert } from "../lib/position";

// Card ids are backend Mongo _id strings once real; optimistic creates get
// a temp id of this shape until the server confirms them.
const isTempId = (id) => typeof id === "string" && id.startsWith("temp-");

export function useBoard(boardId, user) {
  const [board, setBoard] = useState(null);
  const [columns, setColumns] = useState([]); // array of column objects
  const [cards, setCards] = useState({}); // id -> card
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [editingByCard, setEditingByCard] = useState({}); // cardId -> [users]
  const [connected, setConnected] = useState(socket.connected);
  const [joined, setJoined] = useState(false);
  const [toasts, setToasts] = useState([]);

  // operationId -> { type, rollback(), tempId?, timeoutId? }
  const pendingOps = useRef(new Map());
  // Last "columnId::title" create + when, so an accidental repeat fire of
  // createCard (double submit, stray duplicate event) within a heartbeat
  // is treated as one request instead of creating two cards.
  const lastCreateRef = useRef({ key: null, time: 0 });
  // How long we wait for the server to ack an optimistic change before we
  // give up on it ourselves. If the ack never arrives (dropped event,
  // operationId that doesn't round-trip, a backend hiccup) the optimistic
  // card/edit would otherwise sit there forever — including a "temp-"
  // card that looks like a duplicate the next time the real one shows up
  // through some other path (a resync, another client's view, etc).
  const PENDING_TIMEOUT_MS = 8000;
  // signature ("columnId::title::description") -> { cardId, time } for the
  // most recent card:created we accepted. If the server ever sends a second
  // card:created for the same signature within a couple seconds (a backend
  // double-insert/double-emit), we treat it as a duplicate rather than
  // showing two identical cards.
  const recentCreatesRef = useRef(new Map());

  const pushToast = useCallback((message) => {
    const id = newOperationId();
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => {
      setToasts((t) => t.filter((toast) => toast.id !== id));
    }, 4500);
  }, []);

  const clearPendingTimeout = useCallback((op) => {
    if (op?.timeoutId) clearTimeout(op.timeoutId);
  }, []);

  const trackPending = useCallback(
    (operationId, opData) => {
      const timeoutId = setTimeout(() => {
        const op = pendingOps.current.get(operationId);
        if (!op) return; // already resolved by a real server response
        pendingOps.current.delete(operationId);
        op.rollback?.();
        pushToast("That change timed out — please try again.");
      }, PENDING_TIMEOUT_MS);
      pendingOps.current.set(operationId, { ...opData, timeoutId });
    },
    [pushToast]
  );

  const applyState = useCallback((state) => {
    setBoard(state.board);
    setColumns(state.columns || []);
    const cardMap = {};
    for (const c of state.cards || []) cardMap[c._id] = c;
    setCards(cardMap);
    if (state.onlineUsers) setOnlineUsers(state.onlineUsers);
  }, []);

  const join = useCallback(() => {
    if (!boardId) return;
    socket.emit("board:join", {
      boardId,
      userId: user.userId,
      userName: user.userName,
    });
  }, [boardId, user.userId, user.userName]);

  useEffect(() => {
    if (!boardId) return;

    if (!socket.connected) socket.connect();

    const onConnect = () => {
      setConnected(true);
      // Covers both the first connect and any later reconnect — always
      // ask the server for the authoritative state rather than trusting
      // whatever we had locally before the drop.
      join();
    };
    const onDisconnect = () => {
      setConnected(false);
      setJoined(false);
    };

    const onBoardState = (state) => {
      applyState(state);
      setJoined(true);
    };

    const onPresenceUpdate = (payload) => {
      if (payload.boardId !== boardId) return;
      setOnlineUsers(payload.onlineUsers || []);
    };

    const onCardEditing = (payload) => {
      setEditingByCard((prev) => ({
        ...prev,
        [payload.cardId]: payload.editingUsers || [],
      }));
    };

    const resolvePending = (operationId) => {
      const op = pendingOps.current.get(operationId);
      if (op) {
        pendingOps.current.delete(operationId);
        clearPendingTimeout(op);
      }
      return op;
    };

    const onCardCreated = ({ operationId, card }) => {
      const sig = `${card.columnId}::${card.title}::${card.description || ""}`;
      const now = Date.now();
      const recent = recentCreatesRef.current.get(sig);

      if (recent && recent.cardId !== card._id && now - recent.time < 2500) {
        // Same column+title+description as a card we just accepted, but a
        // different id — the backend produced a second document for what
        // looks like one create. Drop the duplicate instead of rendering
        // it, and try to clean it up server-side so it doesn't come back.
        resolvePending(operationId);
        socket.emit("card:delete", {
          operationId: newOperationId(),
          boardId,
          cardId: card._id,
          version: card.version,
        });
        return;
      }

      if (recentCreatesRef.current.size > 200) recentCreatesRef.current.clear();
      recentCreatesRef.current.set(sig, { cardId: card._id, time: now });

      setCards((prev) => {
        const next = { ...prev };
        const op = pendingOps.current.get(operationId);
        if (op?.tempId) delete next[op.tempId];

        // Belt-and-braces: also clear out any OTHER optimistic temp card
        // in this column with the same title/description. Normally the
        // tempId lookup above is enough, but if the server's ack ever
        // comes back with an operationId that doesn't match what we sent
        // (or the ack for an earlier attempt arrives late), the lookup
        // above misses it and the temp card is orphaned — which is what
        // shows up as a "double card" sitting next to the real one.
        for (const [id, c] of Object.entries(next)) {
          if (
            id !== card._id &&
            id.startsWith("temp-") &&
            c._pending &&
            c.columnId === card.columnId &&
            c.title === card.title &&
            (c.description || "") === (card.description || "")
          ) {
            delete next[id];
          }
        }

        next[card._id] = card;
        return next;
      });
      resolvePending(operationId);
    };

    const onCardUpdated = ({ operationId, card }) => {
      setCards((prev) => ({ ...prev, [card._id]: card }));
      resolvePending(operationId);
    };

    const onCardDeleted = ({ operationId, cardId }) => {
      setCards((prev) => {
        const next = { ...prev };
        delete next[cardId];
        return next;
      });
      resolvePending(operationId);
    };

    const onCardMoved = ({ operationId, card }) => {
      setCards((prev) => ({ ...prev, [card._id]: card }));
      resolvePending(operationId);
    };

    const onOperationRejected = ({ operationId, reason, message, latestCard }) => {
      const op = resolvePending(operationId);
      if (op?.rollback) op.rollback(latestCard);
      pushToast(message || reason || "That change couldn't be saved.");
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("board:state", onBoardState);
    socket.on("presence:update", onPresenceUpdate);
    socket.on("card:editing", onCardEditing);
    socket.on("card:created", onCardCreated);
    socket.on("card:updated", onCardUpdated);
    socket.on("card:deleted", onCardDeleted);
    socket.on("card:moved", onCardMoved);
    socket.on("operation:rejected", onOperationRejected);

    if (socket.connected) join();

    return () => {
      socket.emit("board:leave", { boardId });
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("board:state", onBoardState);
      socket.off("presence:update", onPresenceUpdate);
      socket.off("card:editing", onCardEditing);
      socket.off("card:created", onCardCreated);
      socket.off("card:updated", onCardUpdated);
      socket.off("card:deleted", onCardDeleted);
      socket.off("card:moved", onCardMoved);
      socket.off("operation:rejected", onOperationRejected);
      for (const op of pendingOps.current.values()) clearPendingTimeout(op);
      pendingOps.current.clear();
      setJoined(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  const resync = useCallback(() => {
    socket.emit("board:resync", { boardId });
  }, [boardId]);

  // ---- card actions ----

  const cardsInColumn = useCallback(
    (columnId, excludeId) =>
      Object.values(cards)
        .filter((c) => c.columnId === columnId && c._id !== excludeId)
        .sort((a, b) => a.position - b.position),
    [cards]
  );

  const createCard = useCallback(
    (columnId, title, description = "") => {
      const key = `${columnId}::${title}`;
      const now = Date.now();
      if (lastCreateRef.current.key === key && now - lastCreateRef.current.time < 800) {
        return;
      }
      lastCreateRef.current = { key, time: now };

      const operationId = newOperationId();
      const tempId = `temp-${operationId}`;
      const position = positionForInsert(cardsInColumn(columnId), Infinity);

      const optimisticCard = {
        _id: tempId,
        boardId,
        columnId,
        title,
        description,
        position,
        version: 0,
        _pending: true,
      };

      setCards((prev) => ({ ...prev, [tempId]: optimisticCard }));
      trackPending(operationId, {
        type: "create",
        tempId,
        rollback: () => {
          setCards((prev) => {
            const next = { ...prev };
            delete next[tempId];
            return next;
          });
        },
      });

      socket.emit("card:create", { operationId, boardId, columnId, title, description });
    },
    [boardId, cardsInColumn, trackPending]
  );

  const updateCard = useCallback(
    (cardId, changes) => {
      const current = cards[cardId];
      if (!current || isTempId(cardId)) return;

      const operationId = newOperationId();
      const previous = current;

      setCards((prev) => ({ ...prev, [cardId]: { ...current, ...changes } }));
      trackPending(operationId, {
        type: "update",
        rollback: (latestCard) => {
          setCards((prev) => ({ ...prev, [cardId]: latestCard || previous }));
        },
      });

      socket.emit("card:update", {
        operationId,
        boardId,
        cardId,
        version: current.version,
        changes,
      });
    },
    [boardId, cards, trackPending]
  );

  const deleteCard = useCallback(
    (cardId) => {
      const current = cards[cardId];
      if (!current || isTempId(cardId)) return;

      const operationId = newOperationId();
      const previous = current;

      setCards((prev) => {
        const next = { ...prev };
        delete next[cardId];
        return next;
      });
      trackPending(operationId, {
        type: "delete",
        rollback: (latestCard) => {
          if (latestCard) {
            setCards((prev) => ({ ...prev, [cardId]: latestCard }));
          } else {
            setCards((prev) => ({ ...prev, [cardId]: previous }));
          }
        },
      });

      socket.emit("card:delete", { operationId, boardId, cardId, version: current.version });
    },
    [boardId, cards, trackPending]
  );

  // index = target index within the destination column's card list
  const moveCard = useCallback(
    (cardId, toColumn, index) => {
      const current = cards[cardId];
      if (!current || isTempId(cardId)) return;

      const fromColumn = current.columnId;
      const destCards = cardsInColumn(toColumn, cardId);
      const position = positionForInsert(destCards, index);

      const operationId = newOperationId();
      const previous = { columnId: current.columnId, position: current.position, version: current.version };

      setCards((prev) => ({
        ...prev,
        [cardId]: { ...current, columnId: toColumn, position },
      }));
      trackPending(operationId, {
        type: "move",
        rollback: (latestCard) => {
          setCards((prev) => ({
            ...prev,
            [cardId]: latestCard || { ...current, ...previous },
          }));
        },
      });

      socket.emit("card:move", {
        operationId,
        boardId,
        cardId,
        version: current.version,
        fromColumn,
        toColumn,
        position,
      });
    },
    [boardId, cards, cardsInColumn, trackPending]
  );

  const startEditing = useCallback(
    (cardId) => {
      socket.emit("card:editing:start", {
        boardId,
        cardId,
        userId: user.userId,
        userName: user.userName,
      });
    },
    [boardId, user.userId, user.userName]
  );

  const stopEditing = useCallback(
    (cardId) => {
      socket.emit("card:editing:stop", { boardId, cardId, userId: user.userId });
    },
    [boardId, user.userId]
  );

  // ---- column actions (REST-only — see events.md, no socket column events) ----

  const addColumn = useCallback(
    async (name) => {
      const position = columns.length
        ? Math.max(...columns.map((c) => c.position)) + 1000
        : 1000;
      try {
        await api.createColumn(boardId, name, position);
        resync();
      } catch (err) {
        pushToast("Couldn't create that column — try again.");
      }
    },
    [boardId, columns, resync, pushToast]
  );

  const renameColumn = useCallback(
    async (columnId, name) => {
      try {
        await api.updateColumn(columnId, { name });
        resync();
      } catch (err) {
        pushToast("Couldn't rename that column — try again.");
      }
    },
    [resync, pushToast]
  );

  const removeColumn = useCallback(
    async (columnId) => {
      try {
        await api.deleteColumn(columnId);
        resync();
      } catch (err) {
        pushToast("Couldn't delete that column — try again.");
      }
    },
    [resync, pushToast]
  );

  return {
    board,
    columns: [...columns].sort((a, b) => a.position - b.position),
    cards,
    cardsInColumn,
    onlineUsers,
    editingByCard,
    connected,
    joined,
    toasts,
    resync,
    createCard,
    updateCard,
    deleteCard,
    moveCard,
    startEditing,
    stopEditing,
    addColumn,
    renameColumn,
    removeColumn,
  };
}
