import { type CSSProperties, type FC, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../../lib/useReducedMotion";
import { cn } from "../../lib/utils";

type ProgressPhase = "idle" | "loading" | "complete";

export type RouteProgressBarProps = {
	/** Whether a navigation is currently pending. The consumer derives this from
	 *  its router (e.g. `useRouterState().isLoading`); the bar stays router-agnostic. */
	active: boolean;
	className?: string;
};

// While loading the bar eases toward this width and holds — it never reaches
// 100% until the navigation actually resolves, the classic "indeterminate but
// reassuring" feel.
const LOADING_WIDTH = 90;

// Long enough for the feedback fill plus the delayed feedback fade to play out
// before the bar snaps back to 0 (it is invisible at opacity 0 by then).
const RESET_DELAY_MS = 360;

export const RouteProgressBar: FC<RouteProgressBarProps> = (props) => {
	const { active, className } = props;

	const reduced = useReducedMotion();
	const [phase, setPhase] = useState<ProgressPhase>("idle");
	const wasActiveRef = useRef(false);

	useEffect(() => {
		if (active) {
			wasActiveRef.current = true;
			setPhase("loading");
			return;
		}
		// Only run the completion animation if we were actually mid-navigation.
		if (!wasActiveRef.current) return;
		wasActiveRef.current = false;
		setPhase("complete");
		const timer = window.setTimeout(() => setPhase("idle"), RESET_DELAY_MS);
		return () => window.clearTimeout(timer);
	}, [active]);

	const width = phase === "loading" ? LOADING_WIDTH : phase === "complete" ? 100 : 0;
	const opacity = phase === "loading" ? 1 : 0;

	// Under reduced motion we animate opacity only — the bar fades in/out at its
	// target width and never visibly grows. Otherwise width rides the feedback
	// timing, and on completion the fade is delayed by one feedback beat so the
	// bar fills to 100% first, then fades.
	const transition = reduced
		? "opacity var(--motion-feedback-duration) var(--motion-feedback-ease)"
		: [
				"width var(--motion-feedback-duration) var(--motion-feedback-ease)",
				`opacity var(--motion-feedback-duration) var(--motion-feedback-ease)${
					phase === "complete" ? " var(--motion-feedback-duration)" : ""
				}`,
			].join(", ");

	const style: CSSProperties = {
		width: `${width}%`,
		opacity,
		transition,
		zIndex: "var(--z-sticky)",
		boxShadow: "0 0 8px color-mix(in oklab, var(--color-primary-400) 70%, transparent)",
	};

	return (
		<div
			aria-hidden="true"
			data-state={phase}
			className={cn("pointer-events-none fixed inset-x-0 top-0 h-0.5 bg-primary-400", className)}
			style={style}
		/>
	);
};
