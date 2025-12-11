// Placeholder scene management. In a full build this would load GLTF assets.
export type Entity = {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
};

export class Scene {
  entities: Map<string, Entity> = new Map();

  add(entity: Entity) {
    this.entities.set(entity.id, entity);
  }

  update(delta: number) {
    // Simple idle animation: rotate dummy
    this.entities.forEach((e) => {
      e.rotation[1] += delta * 0.5;
    });
  }
}

export function createDemoScene() {
  const scene = new Scene();
  scene.add({
    id: "hero",
    name: "Dummy Hero",
    position: [0, 0, 0],
    rotation: [0, 0, 0],
  });
  return scene;
}

