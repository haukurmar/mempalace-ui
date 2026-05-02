/**
 * Breakpoints — min-width values in logical pixels.
 *
 * The `AndAbove` suffix makes direction explicit at call sites: a style keyed
 * `tabletAndAbove` applies at tablet width AND larger.
 *
 * `phoneAndAbove` is 0 because some adapters require a baseline breakpoint at
 * 0; on web it's harmless.
 */
export const breakpoints = {
	phoneAndAbove: 0,
	tabletAndAbove: 640,
	laptopAndAbove: 1024,
	desktopAndAbove: 1440,
} as const;
