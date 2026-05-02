/**
 * Z-index scale — named layers for stacking context management.
 */
export const zIndices = {
	hide: -1,
	base: 0,
	docked: 10,
	dropdown: 100,
	sticky: 200,
	overlay: 300,
	modal: 400,
	popover: 500,
	toast: 600,
	tooltip: 700,
} as const;
