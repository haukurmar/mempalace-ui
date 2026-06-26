import { EmptyState, ErrorState, MetadataTable } from "@memui/ui/components";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { type FC, useEffect, useRef } from "react";
import { getPalaceChangeStamp, getStatus } from "../server/functions";
import type { StatusPayload } from "../server/handlers";

const REQUIRED_VERSION = "v3.3.4";
const POLL_INTERVAL_MS = 5_000;

const errorMessageOf = (err: unknown): string => {
	if (err === null || err === undefined) return "Unknown error";
	if (typeof err === "object" && "message" in err && typeof err.message === "string") {
		return err.message;
	}
	return String(err);
};

const SqliteSummary: FC<{ status: StatusPayload }> = (props) => {
	const { status } = props;
	if (status.sqlite.status === "error") {
		const isMissingPalace = status.sqlite.openErrorCode === "SQLITE_CANTOPEN";
		if (isMissingPalace) {
			return (
				<EmptyState
					title="No palace found"
					description={`No MemPalace at ${status.palacePath}. Run \`mempalace init\` to create one, or set MEMPAL_PALACE_PATH to point at an existing palace.`}
				/>
			);
		}
		return (
			<ErrorState
				title="Palace SQLite unavailable"
				description={`Could not open ${status.palacePath}/chroma.sqlite3 — ${status.sqlite.message}.`}
			/>
		);
	}
	const data: Record<string, string | number> = {
		"Palace path": status.palacePath,
		"Schema version": status.schemaVersion ?? "unknown",
		"Total drawers": status.totalDrawers ?? 0,
		"SQLite status": status.sqlite.status,
	};
	return <MetadataTable data={data} />;
};

const McpBanner: FC<{ status: StatusPayload }> = (props) => {
	const { status } = props;
	const mcp = status.mcp;
	if (mcp.status === "ok") {
		return (
			<MetadataTable
				data={{ "MCP status": "ok", "MCP version": mcp.version, Floor: REQUIRED_VERSION }}
			/>
		);
	}
	if (mcp.status === "incompatible") {
		return (
			<ErrorState
				title="Incompatible MemPalace MCP"
				description={`Detected ${mcp.detectedVersion}. This UI requires MemPalace ${REQUIRED_VERSION} or newer. Upgrade MemPalace and restart the server.`}
			/>
		);
	}
	return (
		<EmptyState
			title="mempalace-mcp is offline"
			description={`Reads still work; writes are disabled. Reason: ${mcp.reason}`}
		/>
	);
};

const ConnectionPage: FC = () => {
	const queryClient = useQueryClient();
	const statusQuery = useQuery({
		queryKey: ["connection", "status"],
		queryFn: () => getStatus(),
	});
	const stampQuery = useQuery({
		queryKey: ["palace", "changeStamp"],
		queryFn: () => getPalaceChangeStamp(),
		refetchInterval: POLL_INTERVAL_MS,
	});

	const lastSeenStamp = useRef<number | null>(null);

	useEffect(() => {
		const stamp = stampQuery.data?.changedAt;
		if (stamp === undefined) return;
		if (lastSeenStamp.current !== null && stamp > lastSeenStamp.current) {
			queryClient.invalidateQueries({ queryKey: ["connection", "status"] });
		}
		lastSeenStamp.current = stamp;
	}, [stampQuery.data, queryClient]);

	return (
		// Owns its own vertical scroll inside the shell `main` (body scroll is
		// locked), and is no longer a `<main>` landmark — the shell provides that.
		<div className="h-full w-full overflow-y-auto">
			<div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
				<header className="flex flex-col gap-1">
					<h1 className="text-xl font-semibold text-primary-900">Palace connection</h1>
					<p className="text-sm text-secondary-700">
						Live SQLite + MCP status. The page polls a change stamp every {POLL_INTERVAL_MS / 1000}s
						so external writes invalidate cached queries.
					</p>
				</header>

				{statusQuery.isLoading ? (
					<EmptyState
						title="Probing palace…"
						description="Opening SQLite and pinging mempalace-mcp."
					/>
				) : statusQuery.isError ? (
					<ErrorState
						title="Could not load palace status"
						description={errorMessageOf(statusQuery.error)}
					/>
				) : statusQuery.data ? (
					<>
						<section className="flex flex-col gap-2">
							<h2 className="text-sm font-medium text-primary-900">SQLite</h2>
							<SqliteSummary status={statusQuery.data} />
						</section>
						<section className="flex flex-col gap-2">
							<h2 className="text-sm font-medium text-primary-900">MCP</h2>
							<McpBanner status={statusQuery.data} />
						</section>
					</>
				) : null}
			</div>
		</div>
	);
};

export const Route = createFileRoute("/connection")({
	component: ConnectionPage,
});
