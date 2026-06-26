import { AppRail, RouteProgressBar } from "@memui/ui/components";
import { useCommandPalette } from "@memui/ui/keyboard";
import { AppShell } from "@memui/ui/patterns";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { type FC, useCallback } from "react";
import { RAIL_ITEMS, railIdForPathname, renderRailItem } from "./rail-nav";
import { useRailExpanded } from "./useRailExpanded";

/**
 * The persistent app frame: the slim instrument rail beside the routed `main`,
 * with a route-progress bar pinned to the top edge and driven by the router's
 * pending state. Mounted under the command-palette provider so the rail's
 * footer ⌘K can open the palette.
 */
export const AppFrame: FC = () => {
	const { setOpen } = useCommandPalette();
	const { expanded, toggle: handleToggleRail } = useRailExpanded();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const isNavigating = useRouterState({ select: (s) => s.status === "pending" });
	const activeId = railIdForPathname(pathname);

	const handleCommandPalette = useCallback(() => {
		setOpen(true);
	}, [setOpen]);

	return (
		<>
			<RouteProgressBar active={isNavigating} />
			<AppShell
				rail={
					<AppRail
						items={RAIL_ITEMS}
						activeId={activeId}
						renderItem={renderRailItem}
						density="comfortable"
						expanded={expanded}
						onToggleExpanded={handleToggleRail}
						onCommandPalette={handleCommandPalette}
						aria-label="Primary navigation"
					/>
				}
			>
				<Outlet />
			</AppShell>
		</>
	);
};
