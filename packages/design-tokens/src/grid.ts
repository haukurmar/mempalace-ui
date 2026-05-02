/**
 * Grid foundation — the 4pt base unit every spacing and radius token derives from.
 */

export const GRID_UNIT = 4;

export type GridUnits = number;

/**
 * Convert a grid-unit count to pixels.
 *
 *   size(1) = 4
 *   size(2) = 8   (spacing.small)
 *   size(4) = 16  (spacing.regular)
 *   size(6) = 24  (spacing.large)
 *
 * Use this as the escape hatch when the named scales don't fit. If a value
 * keeps recurring, promote it to the relevant scale.
 */
export const size = (units: GridUnits): number => units * GRID_UNIT;
