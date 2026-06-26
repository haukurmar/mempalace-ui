import type { CSSProperties, FC } from "react";

export type MastheadProps = {
	/** The portal's name — the hero word. Defaults to the product name. */
	title?: string;
};

const eyebrowStyle: CSSProperties = { animationDelay: "80ms" };
const titleStyle: CSSProperties = {
	animationDelay: "200ms",
	// A soft luminous halo + a grounding shadow give the word gravity over the field.
	textShadow:
		"0 0 60px color-mix(in oklab, var(--color-primary-300) 30%, transparent), 0 2px 36px rgba(0,0,0,0.7)",
};
const ruleStyle: CSSProperties = { animationDelay: "520ms" };

/**
 * The quiet-grandeur masthead: a letter-spaced mono eyebrow, the portal name set
 * very large in light-weight Lora with a soft halo, and a thin sand rule. Pure
 * type floating over the constellation — no background, no box.
 */
export const Masthead: FC<MastheadProps> = (props) => {
	const { title = "MemPalace" } = props;

	return (
		<header className="pointer-events-none flex flex-col items-center text-center">
			<span
				style={eyebrowStyle}
				className="observatory-rise font-mono text-[11px] uppercase tracking-[0.62em] text-secondary-300/70"
			>
				The Observatory
			</span>
			<h1
				style={titleStyle}
				className="observatory-rise mt-6 font-serif text-7xl font-normal tracking-[-0.01em] text-secondary-50 sm:text-8xl"
			>
				{title}
			</h1>
			<span
				style={ruleStyle}
				className="observatory-rise mt-7 block h-px w-28 bg-gradient-to-r from-transparent via-secondary-400/70 to-transparent"
			/>
		</header>
	);
};
