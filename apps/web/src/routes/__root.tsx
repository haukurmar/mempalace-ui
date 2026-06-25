/// <reference types="vite/client" />
import {
	CommandPaletteProvider,
	KeybindRegistryProvider,
	KeyboardCheatsheet,
	useKeybind,
} from "@memui/ui/keyboard";
import { Toaster, toast } from "@memui/ui/primitives";
import type { QueryClient } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
	useNavigate,
} from "@tanstack/react-router";
import { type FC, type PropsWithChildren, useCallback } from "react";
import { reconnectMcp } from "../server/functions";
import appCss from "../styles.css?url";

type RootRouteContext = {
	queryClient: QueryClient;
};

const RootDocument: FC<PropsWithChildren> = (props) => {
	const { children } = props;

	return (
		// Phase 15 wires data-density from a localStorage-backed setting; comfortable is the default.
		<html lang="en" data-density="comfortable">
			<head>
				<HeadContent />
			</head>
			<body className="min-h-screen bg-background text-foreground antialiased">
				{children}
				<Scripts />
			</body>
		</html>
	);
};

/**
 * Registers the app's global, palette-visible navigation/command actions into
 * the keybind registry. Lives at the app layer because the handlers depend on
 * the router and query client. The `g`-prefixed specs are real two-step
 * sequences (press `g`, then the second key) resolved by the store's
 * pending-prefix buffer; ids are namespaced (`nav.*`) to match the scoped-id
 * convention and avoid clobbering other registry entries.
 */
const GlobalNavBindings: FC = () => {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const goToSearch = useCallback(() => {
		void navigate({ to: "/search" });
	}, [navigate]);

	const goToBrowse = useCallback(() => {
		void navigate({ to: "/browse" });
	}, [navigate]);

	const refreshPalace = useCallback(() => {
		void queryClient.invalidateQueries({ queryKey: ["palace"] });
		toast.success("Palace queries refreshed");
	}, [queryClient]);

	const reconnect = useCallback(() => {
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
	}, [queryClient]);

	useKeybind({
		id: "nav.search",
		keys: "g s",
		label: "Search palace",
		scope: "global",
		group: "Navigate",
		paletteVisible: true,
		handler: goToSearch,
	});
	useKeybind({
		id: "nav.browse",
		keys: "g b",
		label: "Open browse",
		scope: "global",
		group: "Navigate",
		paletteVisible: true,
		handler: goToBrowse,
	});
	useKeybind({
		id: "nav.refresh",
		keys: "g r",
		label: "Refresh palace",
		scope: "global",
		group: "Palace",
		paletteVisible: true,
		handler: refreshPalace,
	});
	useKeybind({
		id: "nav.reconnect",
		keys: "g c",
		label: "Reconnect MCP",
		scope: "global",
		group: "Palace",
		paletteVisible: true,
		handler: reconnect,
	});

	return null;
};

const RootComponent: FC = () => {
	return (
		<RootDocument>
			<KeybindRegistryProvider>
				<CommandPaletteProvider placeholder="Try Cmd+K — search, browse, reconnect…">
					<GlobalNavBindings />
					<KeyboardCheatsheet />
					<Outlet />
					<Toaster position="bottom-right" />
				</CommandPaletteProvider>
			</KeybindRegistryProvider>
		</RootDocument>
	);
};

export const Route = createRootRouteWithContext<RootRouteContext>()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "MemPalace UI" },
			{
				name: "description",
				content: "Local web UI for browsing and curating your MemPalace.",
			},
		],
		links: [{ rel: "stylesheet", href: appCss }],
	}),
	component: RootComponent,
});
