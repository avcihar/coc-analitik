export interface BuildAreaCorners {
  top: { x: number; y: number };
  right: { x: number; y: number };
  bottom: { x: number; y: number };
  left: { x: number; y: number };
}

export interface SceneryAssetConfig {
  id: string;
  name: string;
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  buildArea: BuildAreaCorners;
}

export interface WallAssetConfig {
  id: string;
  name: string;
  src: string;
  naturalWidth: number;
  naturalHeight: number;
}

export interface AssetsConfig {
  scenery: SceneryAssetConfig;
  wall: WallAssetConfig;
}

/**
 * Static configuration for scenery background and wall textures.
 * Coordinates are in natural scenery pixel space (3705 x 2545).
 */
export const ASSETS_CONFIG: AssetsConfig = {
  scenery: {
    id: "winter",
    name: "Kış Sahnesi (Winter)",
    src: "/sceneries/Scenery_Ingame_Winter.webp",
    naturalWidth: 3705,
    naturalHeight: 2545,
    buildArea: {
      top: { x: 1894.5, y: 265.5 },
      right: { x: 3107.0, y: 1175.0 },
      bottom: { x: 1894.5, y: 2084.5 },
      left: { x: 682.0, y: 1175.0 },
    },
  },
  wall: {
    id: "wall19",
    name: "Seviye 19 Duvar (Wall 19)",
    src: "/walls/Wall19.webp",
    naturalWidth: 58,
    naturalHeight: 73,
  },
};

/**
 * Maps 44x44 grid coordinates (col, row) to natural scenery image pixel coordinates (x, y)
 * using bilinear / affine interpolation between the 4 corners of buildArea.
 */
export function mapGridToScenery(
  col: number,
  row: number,
  buildArea: BuildAreaCorners = ASSETS_CONFIG.scenery.buildArea
): { x: number; y: number } {
  const u = col / 44.0;
  const v = row / 44.0;
  const { top, right, bottom, left } = buildArea;

  const x =
    (1 - u) * (1 - v) * top.x +
    u * (1 - v) * right.x +
    u * v * bottom.x +
    (1 - u) * v * left.x;

  const y =
    (1 - u) * (1 - v) * top.y +
    u * (1 - v) * right.y +
    u * v * bottom.y +
    (1 - u) * v * left.y;

  return { x, y };
}

/**
 * Inverse mapping: maps a natural scenery image pixel coordinate (px, py)
 * back to 44x44 grid coordinates (col, row).
 */
export function mapSceneryToGrid(
  px: number,
  py: number,
  buildArea: BuildAreaCorners = ASSETS_CONFIG.scenery.buildArea
): { col: number; row: number } {
  const { top, right, bottom, left } = buildArea;

  const V_rx = right.x - top.x;
  const V_ry = right.y - top.y;
  const V_lx = left.x - top.x;
  const V_ly = left.y - top.y;

  const dx = px - top.x;
  const dy = py - top.y;

  const det = V_rx * V_ly - V_ry * V_lx;
  if (Math.abs(det) < 1e-6) {
    return { col: 0, row: 0 };
  }

  const u = (dx * V_ly - dy * V_lx) / det;
  const v = (V_rx * dy - V_ry * dx) / det;

  return {
    col: u * 44.0,
    row: v * 44.0,
  };
}
