import { useKeybind, useScope } from "@memui/ui/keyboard";
import type { FC } from "react";
import type { GraphLayoutMode } from "../../../graph/renderer/GraphRenderer";

export type GraphKeybindingsProps = {
	/** Whether a node is currently isolated (focus mode). Drives the Esc seam. */
	isolated: boolean;
	/** Enter focus mode on the selected node (L). No-op upstream if nothing is selected. */
	onIsolate: () => void;
	/** Exit focus mode / clear isolation. */
	onExitIsolate: () => void;
	/** Switch the layout mode (1/2/3). */
	onSetLayout: (mode: GraphLayoutMode) => void;
	/** Advance the color mode cycle (C). */
	onCycleColor: () => void;
	/** Toggle cross-wing tunnel visibility (T). */
	onToggleTunnels: () => void;
};

type ExitIsolateBindingProps = {
	onExitIsolate: () => void;
};

/**
 * Registered only while a node is isolated, so Esc stays free for other
 * surfaces (palette, dialogs) when the graph is not in focus mode.
 */
const ExitIsolateBinding: FC<ExitIsolateBindingProps> = (props) => {
	const { onExitIsolate } = props;
	useKeybind({
		id: "graph.exit-isolate",
		keys: "Escape",
		label: "Exit focus mode",
		scope: "graph",
		group: "Graph",
		handler: onExitIsolate,
	});
	return null;
};

/**
 * Establishes the "graph" keybind scope while the /graph route is mounted and
 * registers the layout (1/2/3), color-cycle (C), isolate (L), and
 * toggle-tunnels (T) bindings plus the Esc → exit-isolate seam (registered only
 * while a node is isolated).
 */
export const GraphKeybindings: FC<GraphKeybindingsProps> = (props) => {
	const { isolated, onIsolate, onExitIsolate, onSetLayout, onCycleColor, onToggleTunnels } = props;
	useScope("graph");

	useKeybind({
		id: "graph.layout-explode",
		keys: "1",
		label: "Explode layout",
		scope: "graph",
		group: "Graph",
		handler: () => onSetLayout("explode"),
	});
	useKeybind({
		id: "graph.layout-orbit",
		keys: "2",
		label: "Orbit layout",
		scope: "graph",
		group: "Graph",
		handler: () => onSetLayout("orbit"),
	});
	useKeybind({
		id: "graph.layout-cluster",
		keys: "3",
		label: "Cluster layout",
		scope: "graph",
		group: "Graph",
		handler: () => onSetLayout("cluster"),
	});
	useKeybind({
		id: "graph.cycle-color",
		keys: "c",
		label: "Cycle color mode",
		scope: "graph",
		group: "Graph",
		handler: onCycleColor,
	});
	useKeybind({
		id: "graph.isolate",
		keys: "l",
		label: "Isolate 2-hop neighborhood",
		scope: "graph",
		group: "Graph",
		handler: onIsolate,
	});
	useKeybind({
		id: "graph.toggle-tunnels",
		keys: "t",
		label: "Toggle cross-wing tunnels",
		scope: "graph",
		group: "Graph",
		handler: onToggleTunnels,
	});

	return isolated ? <ExitIsolateBinding onExitIsolate={onExitIsolate} /> : null;
};
