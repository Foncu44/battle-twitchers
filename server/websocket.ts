import { WebSocketServer, WebSocket } from "ws";
import { Database } from "./database";
import { handleBattleStart } from "./battle-logic";

type Client = WebSocket & { userId?: string; roomId?: string };

type IncomingMessage =
  | { type: "join_room"; payload: { roomId: string; userId: string } }
  | {
      type: "create_character";
      payload: {
        roomId: string;
        userId: string;
        name: string;
        clazz: string;
        stats: StatsPayload;
      };
    }
  | {
      type: "update_stats";
      payload: { roomId: string; userId: string; stats: Partial<StatsPayload> };
    }
  | { type: "start_battle"; payload: { roomId: string } };

type StatsPayload = {
  health: number;
  damage: number;
  armor: number;
  speed: number;
  abilities: string[];
};

export function registerWebSocketHandlers(wss: WebSocketServer, db: Database) {
  wss.on("connection", (ws: Client) => {
    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as IncomingMessage;
        routeMessage(ws, msg, db, wss);
      } catch (err) {
        console.error("[ws] invalid message", err);
        ws.send(JSON.stringify({ type: "error", message: "invalid message" }));
      }
    });
  });
}

function routeMessage(ws: Client, msg: IncomingMessage, db: Database, wss: WebSocketServer) {
  switch (msg.type) {
    case "join_room": {
      const { roomId, userId } = msg.payload;
      ws.roomId = roomId;
      ws.userId = userId;
      db.addPlayer(roomId, { userId, stats: undefined });
      broadcast(wss, roomId, { type: "player_joined", payload: { userId } });
      break;
    }
    case "create_character": {
      const { roomId, userId, name, clazz, stats } = msg.payload;
      db.saveCharacter(roomId, userId, { name, clazz, stats });
      broadcast(wss, roomId, { type: "character_created", payload: { userId, name, clazz, stats } });
      break;
    }
    case "update_stats": {
      const { roomId, userId, stats } = msg.payload;
      db.updateStats(roomId, userId, stats);
      broadcast(wss, roomId, { type: "stats_updated", payload: { userId, stats } });
      break;
    }
    case "start_battle": {
      const { roomId } = msg.payload;
      const state = db.getRoomState(roomId);
      const result = handleBattleStart(state);
      broadcast(wss, roomId, { type: "battle_started", payload: result });
      break;
    }
    default:
      ws.send(JSON.stringify({ type: "error", message: "unknown type" }));
  }
}

function broadcast(wss: WebSocketServer, roomId: string, data: unknown) {
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    const c = client as Client;
    if (c.readyState === WebSocket.OPEN && c.roomId === roomId) {
      c.send(payload);
    }
  });
}

