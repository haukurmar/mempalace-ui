import { type CSSProperties, type FC, useCallback } from "react";
import type { WingMeta } from "./wings";

export type WingLabelProps = {
	meta: WingMeta;
	/** Projected centroid in canvas pixels (already clamped to the viewport). */
	x: number;
	y: number;
	/** This wing is the one currently hovered/focused. */
	focused: boolean;
	/** Some wing (possibly another) is focused — non-focused labels recede. */
	dimmed: boolean;
	/** Stagger index for the entry reveal. */
	revealIndex: number;
	onFocus: (wing: string) => void;
	onBlur: () => void;
	onSelect: (wing: string) => void;
};

/**
 * A single wing's anchored label: a glowing marker, the wing name in Lora, and —
 * for prominent wings — its drawer count in JetBrains Mono, all tinted the wing's
 * hue. The de-emphasized tail renders as a quiet name + dot. Hovering blooms the
 * cluster; clicking dives the camera then navigates. Pointer-interactive island
 * floating over the otherwise inert ambient canvas.
 */
export const WingLabel: FC<WingLabelProps> = (props) => {
	const { meta, x, y, focused, dimmed, revealIndex, onFocus, onBlur, onSelect } = props;
	const { prominent, hue } = meta;

	const handleEnter = useCallback(() => {
		onFocus(meta.wing);
	}, [meta.wing, onFocus]);

	const handleClick = useCallback(() => {
		onSelect(meta.wing);
	}, [meta.wing, onSelect]);

	const restOpacity = prominent ? 0.92 : 0.5;
	const wrapStyle: CSSProperties = {
		left: `${x}px`,
		top: `${y}px`,
		animationDelay: `${300 + revealIndex * 70}ms`,
		opacity: dimmed ? 0.18 : focused ? 1 : restOpacity,
	};

	const dotSize = prominent ? "h-1.5 w-1.5" : "h-1 w-1";
	const dotStyle: CSSProperties = {
		backgroundColor: hue,
		boxShadow: `0 0 ${focused ? 18 : prominent ? 10 : 5}px ${focused ? 6 : prominent ? 3 : 1}px ${hue}`,
	};

	const nameStyle: CSSProperties = {
		color: hue,
		textShadow: focused
			? `0 0 26px ${hue}, 0 1px 3px rgba(0,0,0,0.7)`
			: `0 0 14px color-mix(in oklab, ${hue} 60%, transparent), 0 1px 2px rgba(0,0,0,0.6)`,
	};

	return (
		<button
			type="button"
			onMouseEnter={handleEnter}
			onMouseLeave={onBlur}
			onFocus={handleEnter}
			onBlur={onBlur}
			onClick={handleClick}
			style={wrapStyle}
			className="observatory-rise pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 rounded-md px-2 py-1 text-center transition-[opacity,transform] duration-500 ease-out hover:scale-[1.05] focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-300/60"
			aria-label={`${meta.label} wing, ${meta.count} memories`}
		>
			<span
				style={dotStyle}
				className={`${dotSize} rounded-full transition-[box-shadow] duration-500`}
			/>
			<span
				style={nameStyle}
				className={`whitespace-nowrap font-serif tracking-wide ${
					prominent ? "text-[14px]/none font-medium" : "text-[11px]/none font-normal"
				}`}
			>
				{meta.label}
			</span>
			{prominent ? (
				<span className="font-mono text-[9px] uppercase tracking-[0.26em] text-secondary-300/55">
					{meta.count.toLocaleString()}
				</span>
			) : null}
		</button>
	);
};
