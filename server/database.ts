import DatabaseConstructor from "better-sqlite3";

type Character = {
  name: string;
  clazz: string;
  stats: {
    health: number;
    damage: number;
    armor: number;
    speed: number;
    abilities: string[];
  };
};

type Player = {
  userId: string;
  character?: Character;
};

export type RoomState = {
  roomId: string;
  players: Map<string, Player>;
};

export class Database {
  private db = new DatabaseConstructor("game.db");
  private rooms: Map<string, RoomState> = new Map();

  constructor() {
    // Keep DB for persistence later; current prototype uses memory map for speed.
    this.db.exec(`CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY);`);
  }

  addPlayer(roomId: string, player: Player) {
    const room = this.getOrCreateRoom(roomId);
    room.players.set(player.userId, player);
  }

  saveCharacter(roomId: string, userId: string, character: Character) {
    const room = this.getOrCreateRoom(roomId);
    room.players.set(userId, { userId, character });
  }

  updateStats(roomId: string, userId: string, stats: Partial<Character["stats"]>) {
    const room = this.getOrCreateRoom(roomId);
    const player = room.players.get(userId);
    if (!player || !player.character) return;
    player.character.stats = { ...player.character.stats, ...stats };
  }

  getRoomState(roomId: string) {
    return this.rooms.get(roomId);
  }

  private getOrCreateRoom(roomId: string): RoomState {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = { roomId, players: new Map() };
      this.rooms.set(roomId, room);
    }
    return room;
  }
}

export function createDatabase() {
  return new Database();
}

