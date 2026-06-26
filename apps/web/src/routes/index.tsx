import { useCommandPalette } from "@memui/ui/keyboard";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type FC, useCallback, useMemo } from "react";
import {
	findTunnels,
	getPalaceChangeStamp,
	getRoomTree,
	getStatus,
	listGraphNodes,
} from "../server/functions";
import { CommandLine } from "./-observatory/CommandLine";
import { Masthead } from "./-observatory/Masthead";
import { Nebula } from "./-observatory/Nebula";
import { ObservatoryCanvas } from "./-observatory/ObservatoryCanvas";
import { Telemetry } from "./-observatory/Telemetry";
import { useReducedMotion } from "./-observatory/useReducedMotion";
import { buildWingMetas } from "./-observatory/wings";

const CHANGE_STAMP_POLL_MS = 5000;

// The portal's display name. The actual palace basename is shown as the location
// subtitle in the telemetry line; this stays the product wordmark (a sensible
// default the user can later override).
const PORTAL_TITLE = "MemPalace";

/** Last path segment of the palace path — the location subtitle. */
const palaceLocationFrom = (palacePath: string | undefined): string =>
	(palacePath ?? "")
		.split(/[/\\]+/)
		.filter(Boolean)
		.pop() ?? "local palace";

const Observatory: FC = () => {
	const { setOpen } = useCommandPalette();
	const navigate = useNavigate();
	const reducedMotion = useReducedMotion();

	// Nodes are load-bearing — the constellation paints from these alone.
	const nodesQuery = useQuery({
		queryKey: ["palace", "graph", "nodes"],
		queryFn: () => listGraphNodes({ data: {} }),
	});
	// Tunnels are MCP-only; failure (offline) must not block the node render.
	const tunnelsQuery = useQuery({
		queryKey: ["palace", "graph", "tunnels"],
		queryFn: () => findTunnels({ data: {} }),
		retry: false,
	});
	const statusQuery = useQuery({
		queryKey: ["palace", "status"],
		queryFn: () => getStatus(),
	});
	const roomTreeQuery = useQuery({
		queryKey: ["palace", "room-tree"],
		queryFn: () => getRoomTree(),
	});
	// Liveness heartbeat — a 5s poll of the change watcher drives the "live" dot.
	const changeStampQuery = useQuery({
		queryKey: ["palace", "change-stamp"],
		queryFn: () => getPalaceChangeStamp(),
		refetchInterval: CHANGE_STAMP_POLL_MS,
		retry: false,
	});

	const handleOpenCommand = useCallback(() => {
		setOpen(true);
	}, [setOpen]);

	const handleWingSelect = useCallback(
		(wing: string) => {
			void navigate({ to: "/browse/$wing", params: { wing } });
		},
		[navigate],
	);

	const wingCounts = useMemo(() => {
		const counts = new Map<string, number>();
		for (const wing of roomTreeQuery.data?.wings ?? []) counts.set(wing.id, wing.drawerCount);
		return counts;
	}, [roomTreeQuery.data]);

	const wingMetas = useMemo(
		() => (nodesQuery.data ? buildWingMetas(nodesQuery.data, wingCounts) : []),
		[nodesQuery.data, wingCounts],
	);

	const status = statusQuery.data;
	const location = palaceLocationFrom(status?.palacePath);
	const mcpVersion = status?.mcp.status === "ok" ? status.mcp.version : null;
	const live = changeStampQuery.isSuccess && nodesQuery.isSuccess;

	return (
		// Fills the shell `main` (no longer the full viewport). The Observatory
		// canvas + label overlay are `absolute inset-0` against this relative box,
		// so the cosmos.gl projection — which is canvas/container-local — stays
		// aligned once the rail insets the area.
		<div className="relative h-full w-full overflow-hidden bg-primary-1000 text-secondary-50">
			{/* Atmospheric nebula behind the (transparent-cleared) star canvas. */}
			<Nebula />

			{nodesQuery.data ? (
				<ObservatoryCanvas
					nodes={nodesQuery.data}
					tunnels={tunnelsQuery.data ?? undefined}
					wingMetas={wingMetas}
					reducedMotion={reducedMotion}
					onWingSelect={handleWingSelect}
				/>
			) : null}

			{/* Atmosphere — faint grain + soft vignette, inert over the canvas. */}
			<div
				aria-hidden
				className="observatory-grain pointer-events-none absolute inset-0 z-10 opacity-[0.05] mix-blend-screen"
			/>
			<div aria-hidden className="observatory-vignette pointer-events-none absolute inset-0 z-10" />

			{/* Typographic overlay — masthead + focal command line, a centered column
			    lifted just above true center for a deliberate, anchored composition. */}
			<div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-11 px-6 pb-[8vh]">
				<Masthead title={PORTAL_TITLE} />
				<CommandLine onOpen={handleOpenCommand} />
			</div>

			{/* Telemetry — instrument line pinned to the lower edge. */}
			<div className="pointer-events-none absolute inset-x-0 bottom-9 z-30 flex justify-center px-6">
				<Telemetry
					location={location}
					totalDrawers={status?.totalDrawers}
					schemaVersion={status?.schemaVersion}
					mcpVersion={mcpVersion}
					live={live}
				/>
			</div>

			{/* Quiet failure: the constellation just stays dark; the overlay still
			    invites search. Surfaced as a faint mono note rather than a modal. */}
			{nodesQuery.isError ? (
				<p className="pointer-events-none absolute inset-x-0 top-8 z-30 text-center font-mono text-xs text-secondary-400/60">
					the constellation is offline — the local palace could not be read
				</p>
			) : null}
		</div>
	);
};

export const Route = createFileRoute("/")({
	component: Observatory,
});
