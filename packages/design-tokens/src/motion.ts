/**
 * Motion tokens — durations, easing curves, and the semantic transitions that
 * consumers actually reference (page transitions, feedback, overlays, expands).
 *
 * Two primitive scales feed one semantic layer:
 *   `duration` — milliseconds, a small ramp from `instant` (no motion) to
 *     `slower` (large surfaces settling in).
 *   `easing`   — named cubic-beziers: `standard` for most UI, `decelerate` for
 *     things entering (overlays), `accelerate` for things leaving, `spring` for
 *     a slight overshoot on playful affordances.
 *
 * `motion` is the named, semantic layer — UI code points at `motion.feedback`,
 * `motion.overlay`, etc. rather than picking a raw duration/curve, so the timing
 * language stays consistent and tunable in one place. The Tailwind adapter emits
 * the primitives as `--duration-*` / `--ease-*` CSS vars and the semantic layer
 * as `--motion-<name>-duration` / `--motion-<name>-ease` (referencing the
 * primitive vars), so `prefers-reduced-motion` collapsing `--duration-*` to 0ms
 * cascades through the semantic vars automatically.
 */

export const duration = {
	instant: 0,
	fast: 120,
	base: 200,
	slow: 320,
	slower: 480,
} as const;

export const easing = {
	standard: "cubic-bezier(0.2, 0, 0, 1)",
	decelerate: "cubic-bezier(0.05, 0.7, 0.1, 1)",
	accelerate: "cubic-bezier(0.3, 0, 1, 1)",
	spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

export const motion = {
	// Route changes: the shell settling on a new view.
	pageTransition: { duration: duration.base, easing: easing.standard },
	// Quick acknowledgements: route-progress bar, rail accent, hover ack.
	feedback: { duration: duration.fast, easing: easing.standard },
	// Surfaces entering over content: Sheet / detail panels.
	overlay: { duration: duration.base, easing: easing.decelerate },
	// Size changes: rail expand/collapse, tree disclosure.
	expand: { duration: duration.base, easing: easing.standard },
} as const;
