/** Safe-zone constants. Mirrors ../../rules/safe_zones.yaml (kept in sync by tests/test_safe_zones.py). */
export const SAFE = {left: 65, right: 880, top: 288, bottom: 1248, railX: 880, railY0: 560, railY1: 1500, tol: 4};
/** Design space used by every template (the original 940x960 art box) → mapped into the safe box. */
export const DESIGN = {x0: 70, x1: 1010, y0: 190, y1: 1150};
export const STAGE_SCALE = 0.85;
export const STAGE_TX = SAFE.left - DESIGN.x0 * STAGE_SCALE;
export const STAGE_TY = SAFE.top - DESIGN.y0 * STAGE_SCALE;
/** Caption band (real coordinates) */
export const CAPTION = {cy: 1172, left: 200, right: 880};
/** Collision-free spots (real coordinates) for the big reaction sticker, per scene template. */
export const REACTION_SLOTS: Record<string, {x: number; y: number; size: number}> = {
  hook_stamp: {x: 600, y: 360, size: 230},
  cards: {x: 690, y: 330, size: 160},
  share: {x: 690, y: 330, size: 160},
  milestone: {x: 690, y: 330, size: 150},
  count_grid: {x: 690, y: 330, size: 160},
  switch_cost: {x: 690, y: 330, size: 160},
  statement: {x: 640, y: 900, size: 200},
  cta_end: {x: 360, y: 345, size: 250},
};
export const HOST = {x: 65, y: 1096, size: 116};
