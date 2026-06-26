import { useEffect, useState } from "react";

/**
 * Tracks the user's `prefers-reduced-motion` setting, live. The Observatory
 * uses it to freeze the ambient drift/twinkle and collapse the staged type
 * reveal into a plain fade — motion is decorative here, never load-bearing.
 */
export const useReducedMotion = (): boolean => {
	const [reduced, setReduced] = useState(false);

	useEffect(() => {
		const query = window.matchMedia("(prefers-reduced-motion: reduce)");
		setReduced(query.matches);
		const handleChange = (event: MediaQueryListEvent) => {
			setReduced(event.matches);
		};
		query.addEventListener("change", handleChange);
		return () => {
			query.removeEventListener("change", handleChange);
		};
	}, []);

	return reduced;
};
