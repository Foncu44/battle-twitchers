export type Stats = {
  health: number;
  damage: number;
  armor: number;
  speed: number;
};

export class Entity {
  constructor(
    public id: string,
    public name: string,
    public stats: Stats,
    public position: [number, number, number] = [0, 0, 0],
  ) {}
}

