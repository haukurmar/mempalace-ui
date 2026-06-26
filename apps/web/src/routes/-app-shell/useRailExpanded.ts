import { useCallback, useEffect, useState } from "react";

// Persisted across reloads so the user's collapse/expand choice sticks. The rail
// is open by default — collapsing is the deliberate, remembered action.
const RAIL_EXPANDED_KEY = "mempalace-ui:rail-expanded";
const RAIL_EXPANDED_DEFAULT = true;

const readExpanded = (): boolean => {
	if (typeof window === "undefined") return RAIL_EXPANDED_DEFAULT;
	try {
		const stored = window.localStorage.getItem(RAIL_EXPANDED_KEY);
		if (stored === "true") return true;
		if (stored === "false") return false;
		return RAIL_EXPANDED_DEFAULT;
	} catch {
		return RAIL_EXPANDED_DEFAULT;
	}
};

const writeExpanded = (value: boolean): void => {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(RAIL_EXPANDED_KEY, String(value));
	} catch {
		// localStorage can throw (quota, private mode). Persisting the rail state
		// is a nice-to-have — never let it break the shell.
	}
};

/**
 * Holds the rail's `expanded` state for the app shell and persists it to
 * `localStorage`. Starts from the SSR-safe default so server and first client
 * render agree, then reconciles with the stored choice on mount (avoiding a
 * hydration mismatch). Returns the current value plus a `toggle` handler.
 */
export const useRailExpanded = () => {
	const [expanded, setExpanded] = useState<boolean>(RAIL_EXPANDED_DEFAULT);

	useEffect(() => {
		setExpanded(readExpanded());
	}, []);

	const toggle = useCallback(() => {
		setExpanded((prev) => {
			const next = !prev;
			writeExpanded(next);
			return next;
		});
	}, []);

	return { expanded, toggle };
};
