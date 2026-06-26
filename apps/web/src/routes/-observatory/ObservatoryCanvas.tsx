import { type FC, useCallback, useEffect, useRef, useState } from "react";
import { createCosmographRenderer } from "../../graph/renderer/CosmographRenderer";
import type {
	GraphNodeData,
	GraphRenderer,
	GraphTunnel,
	WingProjection,
} from "../../graph/renderer/GraphRenderer";
import { WingLabel } from "./WingLabel";
import type { WingMeta } from "./wings";

export type ObservatoryCanvasProps = {
	nodes: GraphNodeData;
	tunnels?: readonly GraphTunnel[];
	wingMetas: readonly WingMeta[];
	reducedMotion: boolean;
	/** Fired after the camera dive completes, to navigate into the wing. */
	onWingSelect: (wing: string) => void;
};

// Throttle the label-projection loop — ~30fps is plenty for ~10 anchored labels
// and keeps React reconciliation off the WebGL frame budget.
const PROJECTION_INTERVAL_MS = 33;
// Camera dive duration before navigating into the wing.
const WING_DIVE_MS = 700;
// Half-label margins so a clamped, edge-anchored label box never clips.
const LABEL_MARGIN_X = 90;
const LABEL_MARGIN_Y = 56;

/**
 * Hosts the ambient cosmos.gl renderer as a full-bleed living wallpaper and
 * floats wing labels over their projected clusters. The canvas itself is inert
 * (pointer-events disabled, no zoom/drag); every interaction flows through the
 * labels, which bloom their cluster on hover and dive the camera on click.
 */
export const ObservatoryCanvas: FC<ObservatoryCanvasProps> = (props) => {
	const { nodes, tunnels, wingMetas, reducedMotion, onWingSelect } = props;
	const containerRef = useRef<HTMLDivElement | null>(null);
	const rendererRef = useRef<GraphRenderer | null>(null);

	const [projections, setProjections] = useState<readonly WingProjection[]>([]);
	const [focusedWing, setFocusedWing] = useState<string | null>(null);

	// Stable refs so the (expensive) mount effect never re-runs on prop churn.
	const tunnelsRef = useRef(tunnels);
	tunnelsRef.current = tunnels;
	const reducedMotionRef = useRef(reducedMotion);
	reducedMotionRef.current = reducedMotion;
	const onWingSelectRef = useRef(onWingSelect);
	onWingSelectRef.current = onWingSelect;

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const renderer = createCosmographRenderer();
		rendererRef.current = renderer;
		let disposed = false;
		let projectionTimer: ReturnType<typeof setInterval> | null = null;

		renderer.setTunnels(tunnelsRef.current ?? null);
		renderer
			.mount(container, { nodes })
			.then(() => {
				if (disposed) {
					renderer.destroy();
					return;
				}
				renderer.enterAmbient({ reducedMotion: reducedMotionRef.current });
				// Pull projected wing centroids on an interval so labels stay glued to
				// their clusters through the ambient drift.
				const project = () => {
					if (disposed) return;
					setProjections(renderer.getWingProjections());
				};
				project();
				projectionTimer = setInterval(project, PROJECTION_INTERVAL_MS);
			})
			.catch((err: unknown) => {
				if (!disposed) console.error("Observatory renderer failed to mount", err);
			});

		return () => {
			disposed = true;
			if (projectionTimer) clearInterval(projectionTimer);
			renderer.destroy();
			rendererRef.current = null;
		};
	}, [nodes]);

	useEffect(() => {
		rendererRef.current?.setTunnels(tunnels ?? null);
	}, [tunnels]);

	const handleFocus = useCallback((wing: string) => {
		setFocusedWing(wing);
		rendererRef.current?.focusWing(wing);
	}, []);

	const handleBlur = useCallback(() => {
		setFocusedWing(null);
		rendererRef.current?.focusWing(null);
	}, []);

	const handleSelect = useCallback((wing: string) => {
		rendererRef.current?.flyToWing(wing, WING_DIVE_MS);
		window.setTimeout(() => {
			onWingSelectRef.current(wing);
		}, WING_DIVE_MS + 60);
	}, []);

	const metaByWing = new Map(wingMetas.map((meta) => [meta.wing, meta]));
	// Keep label boxes fully inside the viewport — clamp near-edge anchors inward
	// by these margins so a cluster at the rim never clips its label off-screen.
	const viewWidth = containerRef.current?.clientWidth ?? 0;
	const viewHeight = containerRef.current?.clientHeight ?? 0;
	const clamp = (value: number, max: number, margin: number): number =>
		max <= margin * 2 ? value : Math.min(Math.max(value, margin), max - margin);

	return (
		<>
			<div ref={containerRef} className="pointer-events-none absolute inset-0" />
			<div className="pointer-events-none absolute inset-0">
				{projections.map((projection, index) => {
					const meta = metaByWing.get(projection.wing);
					if (!meta || !projection.inView) return null;
					return (
						<WingLabel
							key={projection.wing}
							meta={meta}
							x={clamp(projection.x, viewWidth, LABEL_MARGIN_X)}
							y={clamp(projection.y, viewHeight, LABEL_MARGIN_Y)}
							focused={focusedWing === projection.wing}
							dimmed={focusedWing !== null && focusedWing !== projection.wing}
							revealIndex={index}
							onFocus={handleFocus}
							onBlur={handleBlur}
							onSelect={handleSelect}
						/>
					);
				})}
			</div>
		</>
	);
};
