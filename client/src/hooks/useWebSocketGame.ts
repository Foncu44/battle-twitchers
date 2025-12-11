import { useCallback, useEffect, useMemo, useState } from "react";

type CharacterStats = {
  health: number;
  damage: number;
  armor: number;
  speed: number;
  abilities: string[];
};

type Player = { userId: string; character?: { name: string; clazz: string; stats: CharacterStats } };

type Props = { roomId: string; userId: string };

export function useWebSocketGame({ roomId, userId }: Props) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [status, setStatus] = useState("disconnected");
  const [players, setPlayers] = useState<Player[]>([]);

  const connect = useCallback(() => {
    if (ws?.readyState === WebSocket.OPEN) return;
    const socket = new WebSocket(import.meta.env.VITE_WS_URL || "ws://localhost:3001");
    socket.addEventListener("open", () => {
      setStatus("connected");
      socket.send(JSON.stringify({ type: "join_room", payload: { roomId, userId } }));
    });
    socket.addEventListener("close", () => setStatus("disconnected"));
    socket.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data.toString());
      if (msg.type === "player_joined") {
        setPlayers((prev) => [...prev, { userId: msg.payload.userId }]);
      }
      if (msg.type === "character_created") {
        setPlayers((prev) =>
          prev.map((p) => (p.userId === msg.payload.userId ? { ...p, character: msg.payload } : p)),
        );
      }
      if (msg.type === "stats_updated") {
        setPlayers((prev) =>
          prev.map((p) =>
            p.userId === msg.payload.userId && p.character
              ? { ...p, character: { ...p.character, stats: { ...p.character.stats, ...msg.payload.stats } } }
              : p,
          ),
        );
      }
      if (msg.type === "battle_started") {
        console.log("battle started", msg.payload);
      }
    });
    setWs(socket);
  }, [roomId, userId, ws]);

  useEffect(() => {
    return () => {
      ws?.close();
    };
  }, [ws]);

  const sendCreateCharacter = useCallback(
    (character: { name: string; clazz: string; stats: CharacterStats }) => {
      ws?.send(JSON.stringify({ type: "create_character", payload: { roomId, userId, ...character } }));
    },
    [roomId, userId, ws],
  );

  const sendStartBattle = useCallback(() => {
    ws?.send(JSON.stringify({ type: "start_battle", payload: { roomId } }));
  }, [roomId, ws]);

  return useMemo(
    () => ({
      status,
      players,
      connect,
      sendCreateCharacter,
      sendStartBattle,
    }),
    [status, players, connect, sendCreateCharacter, sendStartBattle],
  );
}

