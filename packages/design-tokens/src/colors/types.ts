export type ColorSwatch = { background: string; contrast: string };

export type ColorFamily = Record<
	0 | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 | 1000,
	ColorSwatch
>;
