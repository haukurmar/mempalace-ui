/// <reference types="vite/client" />
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { Toaster } from "@memui/ui/primitives";
import type { FC, PropsWithChildren } from "react";
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
				<Toaster position="bottom-right" />
				<Scripts />
			</body>
		</html>
	);
};

const RootComponent: FC = () => {
	return (
		<RootDocument>
			<Outlet />
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
