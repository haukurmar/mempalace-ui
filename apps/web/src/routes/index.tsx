import { CommandBar, EmptyState, type CommandAction } from "@memui/ui/components";
import { Button } from "@memui/ui/primitives";
import { createFileRoute } from "@tanstack/react-router";
import { type FC, useState } from "react";

const placeholderActions: CommandAction[] = [
	{
		id: "browse",
		label: "Open browse",
		description: "Walk wings, rooms, and drawers",
		group: "Navigate",
		keywords: ["wings", "rooms", "drawers"],
		shortcut: ["g", "b"],
		run: () => {},
	},
	{
		id: "refresh",
		label: "Refresh palace",
		description: "Re-read SQLite and re-probe MCP",
		group: "Palace",
		keywords: ["reload", "sync"],
		run: () => {},
	},
	{
		id: "reconnect",
		label: "Reconnect MCP",
		description: "Probe mempalace-mcp again",
		group: "Palace",
		keywords: ["mcp", "connection"],
		run: () => {},
	},
	{
		id: "search",
		label: "Semantic search",
		description: "Query embeddings across the palace",
		group: "Find",
		keywords: ["query", "embeddings"],
		shortcut: ["/"],
		run: () => {},
	},
];

const HomePage: FC = () => {
	const [open, setOpen] = useState(false);

	const handleOpenCommandBar = () => {
		setOpen(true);
	};

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
					actions={placeholderActions}
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
