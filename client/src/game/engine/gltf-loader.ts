// Placeholder GLTF loader hook. In a real build, plug in a lightweight parser.
// This file documents where to extend to load viewer-submitted avatars.
export type GLTFScene = { nodes: any[] };

export async function loadGLTF(_url: string): Promise<GLTFScene> {
  // TODO: integrate glTF parsing (e.g., @gltf-transform/core or minimal custom loader).
  return { nodes: [] };
}

