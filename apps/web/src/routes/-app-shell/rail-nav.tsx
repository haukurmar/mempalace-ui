import type { RailItemData, RailItemRenderer } from "@memui/ui/components";
import { Link } from "@tanstack/react-router";
import { FolderTree, Home, Network, PlugZap, Search } from "lucide-react";

// id → concrete route path. `as const` keeps the literal types so TanStack
// `Link`'s `to` stays type-checked at the call site.
export const RAIL_ROUTE_BY_ID = {
	home: "/",
	browse: "/browse",
	search: "/search",
	graph: "/graph",
	connection: "/connection",
} as const;

type RailId = keyof typeof RAIL_ROUTE_BY_ID;

// keyHints mirror the real Phase 11 global nav bindings (`nav.browse` = g b,
// `nav.search` = g s). Items without a dedicated binding omit the hint rather
// than inventing one — Home/Graph/Connection are mouse-driven for now.
export const RAIL_ITEMS: RailItemData[] = [
	{ id: "home", icon: <Home />, label: "Home" },
	{ id: "browse", icon: <FolderTree />, label: "Browse", keyHint: ["g", "b"] },
	{ id: "search", icon: <Search />, label: "Search", keyHint: ["g", "s"] },
	{ id: "graph", icon: <Network />, label: "Graph" },
	{ id: "connection", icon: <PlugZap />, label: "Connection" },
];

/**
 * The rail owns the styling and inner content; the consumer only wraps them in a
 * router `Link` so navigation works by mouse (and preload-on-intent) without the
 * rail ever knowing about the router. The supplied `className` is applied to the
 * `Link` so the rail's active/hover treatment is preserved.
 */
export const renderRailItem: RailItemRenderer = (args) => {
	const { item, isActive, expanded, className, children } = args;
	const to = RAIL_ROUTE_BY_ID[item.id as RailId];
	return (
		<Link
			to={to}
			className={className}
			aria-current={isActive ? "page" : undefined}
			aria-label={!expanded ? item.label : undefined}
		>
			{children}
		</Link>
	);
};

/**
 * Derive the active rail item from the router's current pathname, matching the
 * deepest route: a `/browse/$wing/$room` location lights the Browse item, and
 * Home only lights on an exact `/`.
 */
export const railIdForPathname = (pathname: string): string | undefined => {
	let best: { id: string; len: number } | undefined;
	for (const item of RAIL_ITEMS) {
		const to = RAIL_ROUTE_BY_ID[item.id as RailId];
		const matches =
			to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);
		if (matches && (!best || to.length > best.len)) best = { id: item.id, len: to.length };
	}
	return best?.id;
};
