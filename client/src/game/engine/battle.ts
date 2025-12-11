import type { Entity } from "./entity";

export type BattleEvent = { attacker: string; target: string; damage: number };

export function simulateTurn(entities: Entity[]): BattleEvent[] {
  // Placeholder: first attacks second.
  if (entities.length < 2) return [];
  const attacker = entities[0];
  const target = entities[1];
  return [{ attacker: attacker.name, target: target.name, damage: attacker.stats.damage }];
}

