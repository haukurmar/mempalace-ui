import { toast } from "@memui/ui/primitives";
import { useCallback, useState } from "react";
import type { GraphColorMode, GraphLayoutMode } from "../-renderer/GraphRenderer";
import {
	COLOR_KEY,
	COLOR_MODE_LABELS,
	colorModeHint,
	isColorMode,
	isLayoutMode,
	LAYOUT_KEY,
	nextColorMode,
	persist,
	readPersisted,
	readPersistedBool,
	TUNNEL_HIGHLIGHT_DEFAULT,
	TUNNEL_KEY,
} from "./graphModes";

export type UseGraphModesArgs = {
	/** Whether any node carries a precomputed cluster id (drives the cluster hint). */
	hasClusters: boolean;
};

export type UseGraphModes = {
	colorMode: GraphColorMode;
	layoutMode: GraphLayoutMode;
	colorModeLabel: string;
	colorModeHint: string | null;
	cycleColorMode: () => void;
	setLayoutMode: (mode: GraphLayoutMode) => void;
	tunnelHighlight: boolean;
	toggleTunnelHighlight: () => void;
};

/**
 * Owns the graph's color + layout mode state: restores from localStorage on
 * mount, persists on change, advances the color cycle, and toasts on color
 * change. The renderer is told about changes by the route; this hook is the
 * single source of truth for which modes are active. The pure persistence and
 * cycle helpers live in ./graphModes so they can be unit-tested without React.
 */
export const useGraphModes = (args: UseGraphModesArgs): UseGraphModes => {
	const { hasClusters } = args;
	const [colorMode, setColorMode] = useState<GraphColorMode>(() =>
		readPersisted(COLOR_KEY, isColorMode, "room"),
	);
	const [layoutMode, setLayoutModeState] = useState<GraphLayoutMode>(() =>
		readPersisted(LAYOUT_KEY, isLayoutMode, "explode"),
	);
	const [tunnelHighlight, setTunnelHighlight] = useState<boolean>(() =>
		readPersistedBool(TUNNEL_KEY, TUNNEL_HIGHLIGHT_DEFAULT),
	);

	const cycleColorMode = useCallback(() => {
		setColorMode((current) => {
			const next = nextColorMode(current);
			persist(COLOR_KEY, next);
			const hint = colorModeHint(next, hasClusters);
			toast(`Color: ${COLOR_MODE_LABELS[next]}`, hint ? { description: hint } : undefined);
			return next;
		});
	}, [hasClusters]);

	const setLayoutMode = useCallback((mode: GraphLayoutMode) => {
		setLayoutModeState(mode);
		persist(LAYOUT_KEY, mode);
	}, []);

	const toggleTunnelHighlight = useCallback(() => {
		setTunnelHighlight((on) => {
			const next = !on;
			persist(TUNNEL_KEY, String(next));
			return next;
		});
	}, []);

	return {
		colorMode,
		layoutMode,
		colorModeLabel: COLOR_MODE_LABELS[colorMode],
		colorModeHint: colorModeHint(colorMode, hasClusters),
		cycleColorMode,
		setLayoutMode,
		tunnelHighlight,
		toggleTunnelHighlight,
	};
};
