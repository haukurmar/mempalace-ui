/**
 * Graph-view color tokens (Phase 12 palace graph).
 *
 * The palace graph paints up to ~90k WebGL nodes whose RGBA colors are derived
 * from these tokens by the route-private cosmos.gl adapter — the one place
 * allowed to turn token hex into the 0..1 floats the GPU wants.
 *
 * `wingHues` is a CATEGORICAL palette: every wing in the palace is assigned one
 * entry by a stable index, giving each wing a distinct hue family so wings read
 * as separate clusters (spec: "wings are visually distinguished … as hue
 * families"). The list is deliberately longer than today's wing count so newly
 * added wings stay distinct with no code change; assignment wraps modulo the
 * list length. Rooms are shaded WITHIN their wing's hue (see the Room color
 * mode), and the same palette maps `clusterId → hue` once the precompute worker
 * (12.8) lands.
 *
 * Hues are evenly spaced around the wheel at a single, slightly-desaturated
 * saturation/lightness so they read as one cohesive family on the deep-teal
 * canvas backdrop — developer-tool, not carnival.
 */
import { sand, teal } from "./colors";

export const wingHues = [
	"#3FA6A6", // teal
	"#46A66E", // green
	"#88A63F", // olive
	"#C7A23F", // gold
	"#C7773F", // orange
	"#C75F5F", // red
	"#C75F9E", // magenta
	"#9B5FC7", // violet
	"#5F6FC7", // indigo
	"#3F88C7", // blue
] as const satisfies readonly string[];

/**
 * Neutral fill for nodes with no meaningful value under the active color mode:
 * the Decay placeholder (metric undefined) and Cluster before any `clusterId`
 * exists. Muted slate so it reads as "no data", distinct from every wing hue.
 */
export const graphNeutral = "#5E7374";

/**
 * Two-stop gradients for the scalar color modes. Endpoints are pulled from the
 * brand families (`from` = low end, `to` = high end) so the gradients stay on
 * palette and both ends stay visible on the dark canvas.
 *   recency: oldest (mid teal) → newest (pale teal)
 *   size:    smallest (mid sand) → largest (pale sand)
 */
export const recencyGradient = {
	from: teal[500].background,
	to: teal[100].background,
} as const;

export const sizeGradient = {
	from: sand[500].background,
	to: sand[100].background,
} as const;

/**
 * Cross-wing tunnel edge color (12.7). A warm amber so tunnels read as glowing
 * threads stitching wings together — deliberately OUTSIDE the `wingHues` family
 * so an edge never camouflages against the nodes it connects, and bright enough
 * to pop against the deep-teal canvas. Cross-wing tunnels are the only edges the
 * graph draws, so this is the single link hue; the "Show tunnels" toggle controls
 * their VISIBILITY, not their color.
 */
export const tunnelLink = "#E6B450";

export const graphColors = {
	wingHues,
	graphNeutral,
	recencyGradient,
	sizeGradient,
	tunnelLink,
} as const;
