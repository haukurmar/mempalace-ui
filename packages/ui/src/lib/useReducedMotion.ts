import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Tracks the user's `prefers-reduced-motion` setting, live. Components use it to
 * drop non-essential motion (the rail's hover-expand, the progress bar's width
 * growth) while keeping opacity/feedback intact. SSR-safe: starts `false` and
 * resolves on mount.
 */
export const useReducedMotion = (): boolean => {
	const [reduced, setReduced] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
		const mql = window.matchMedia(QUERY);
		setReduced(mql.matches);
		const handleChange = (event: MediaQueryListEvent) => {
			setReduced(event.matches);
		};
		mql.addEventListener("change", handleChange);
		return () => mql.removeEventListener("change", handleChange);
	}, []);

	return reduced;
};
