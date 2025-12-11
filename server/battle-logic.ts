import type { RoomState } from "./database";

export function handleBattleStart(state: RoomState | undefined) {
  if (!state) return { status: "error", reason: "room not found" };
  // Simple placeholder: compute initiative by speed
  const order = [...state.players.values()]
    .filter((p) => p.character)
    .sort((a, b) => (b.character?.stats.speed ?? 0) - (a.character?.stats.speed ?? 0))
    .map((p) => ({
      userId: p.userId,
      name: p.character?.name ?? "unknown",
      speed: p.character?.stats.speed ?? 0,
    }));

  return {
    status: "ok",
    turnOrder: order,
    message: "Battle initialized, simulate client-side for now.",
  };
}

