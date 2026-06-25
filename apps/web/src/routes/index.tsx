import { type CommandAction, CommandBar, EmptyState } from "@memui/ui/components";
import { Button, toast } from "@memui/ui/primitives";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type FC, useMemo, useState } from "react";
import { reconnectMcp } from "../server/functions";

const HomePage: FC = () => {
	const [open, setOpen] = useState(false);
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const handleOpenCommandBar = () => {
		setOpen(true);
	};

	const actions = useMemo<CommandAction[]>(
		() => [
			{
				id: "search",
				label: "Search palace",
				description: "Semantic search across every wing",
				group: "Navigate",
				keywords: ["search", "find", "query", "semantic"],
				shortcut: ["g", "s"],
				run: () => {
					setOpen(false);
					void navigate({ to: "/search" });
				},
			},
			{
				id: "browse",
				label: "Open browse",
				description: "Walk wings, rooms, and drawers",
				group: "Navigate",
				keywords: ["wings", "rooms", "drawers"],
				shortcut: ["g", "b"],
				run: () => {
					setOpen(false);
					void navigate({ to: "/browse" });
				},
			},
			{
				id: "refresh",
				label: "Refresh palace",
				description: "Re-read SQLite and re-probe MCP",
				group: "Palace",
				keywords: ["reload", "sync"],
				run: () => {
					setOpen(false);
					void queryClient.invalidateQueries({ queryKey: ["palace"] });
					toast.success("Palace queries refreshed");
				},
			},
			{
				id: "reconnect",
				label: "Reconnect MCP",
				description: "Probe mempalace-mcp again",
				group: "Palace",
				keywords: ["mcp", "connection"],
				run: () => {
					setOpen(false);
					void (async () => {
						try {
							await reconnectMcp();
							await queryClient.invalidateQueries({ queryKey: ["palace"] });
							await queryClient.invalidateQueries({ queryKey: ["connection", "status"] });
							toast.success("MCP reconnected");
						} catch (err) {
							const message = err instanceof Error ? err.message : String(err);
							toast.error("MCP reconnect failed", { description: message });
						}
					})();
				},
			},
		],
		[navigate, queryClient],
	);

	return (
		<main className="flex min-h-screen items-center justify-center p-6">
			<div className="w-full max-w-xl rounded-lg border border-secondary-200 bg-card p-6 shadow-sm">
				<EmptyState
					title="MemPalace UI is up"
					description="Connect your palace via server functions in the next phase."
					action={
						<Button onClick={handleOpenCommandBar} variant="default">
							Open Cmd+K
						</Button>
					}
				/>
				<CommandBar
					actions={actions}
					open={open}
					onOpenChange={setOpen}
					placeholder="Try Cmd+K — search, browse, reconnect…"
				/>
			</div>
		</main>
	);
};

export const Route = createFileRoute("/")({
	component: HomePage,
});
