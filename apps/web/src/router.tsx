import { LoadingState } from "@memui/ui/components";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import type { FC } from "react";
import { createQueryClient } from "./lib/query-client";
import { routeTree } from "./routeTree.gen";

// The default route-pending fallback: a thin centered wrapper over LoadingState
// that fills the shell `main`. Routes with a heavier, frame-preserving skeleton
// (browse, graph) override this with their own `pendingComponent`.
const RouterPending: FC = () => (
	<div className="flex h-full w-full items-center justify-center">
		<LoadingState />
	</div>
);

export const getRouter = () => {
	const queryClient = createQueryClient();

	const router = createRouter({
		routeTree,
		context: { queryClient },
		defaultPreload: "intent",
		scrollRestoration: true,
		defaultPendingComponent: RouterPending,
		// Hold the pending UI back 150ms so fast loaders never flash a spinner,
		// while slow ones still get feedback (the top progress bar covers the gap).
		defaultPendingMs: 150,
	});

	setupRouterSsrQueryIntegration({
		router,
		queryClient,
	});

	return router;
};

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
