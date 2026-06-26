import type { Meta, StoryObj } from "@storybook/react-vite";
import { Boxes, Home, Network, Search, Settings } from "lucide-react";
import { useState } from "react";
import { AppRail, type RailItemData, RouteProgressBar } from "../../components";
import { AppShell } from "./app-shell";

const items: RailItemData[] = [
	{ id: "home", icon: <Home />, label: "Observatory", keyHint: ["g", "h"] },
	{ id: "browse", icon: <Boxes />, label: "Browse", keyHint: ["g", "b"] },
	{ id: "search", icon: <Search />, label: "Search", keyHint: ["/"] },
	{ id: "graph", icon: <Network />, label: "Graph", keyHint: ["g", "g"] },
	{ id: "settings", icon: <Settings />, label: "Settings", keyHint: ["g", "s"] },
];

const meta: Meta<typeof AppShell> = {
	title: "Patterns/AppShell",
	component: AppShell,
	parameters: { layout: "fullscreen" },
};

export default meta;

type Story = StoryObj<typeof AppShell>;

const handleCommand = () => {
	// no-op in stories
};

/** The everyday frame: an `AppRail` beside a scrolling `main`, with the
 *  `RouteProgressBar` pinned to the top edge. */
export const Default: Story = {
	render: () => {
		const [activeId, setActiveId] = useState("home");
		const [navigating, setNavigating] = useState(false);

		const handleSelect = (id: string) => {
			setActiveId(id);
		};

		const handleToggleNav = () => {
			setNavigating((prev) => !prev);
		};

		const rail = (
			<AppRail
				items={items}
				activeId={activeId}
				onSelect={handleSelect}
				onCommandPalette={handleCommand}
			/>
		);

		return (
			<div className="h-screen">
				<RouteProgressBar active={navigating} />
				<AppShell rail={rail}>
					<div className="flex h-14 shrink-0 items-center border-b border-secondary-200 px-6">
						<h1 className="text-sm font-medium text-primary-900">{activeId}</h1>
						<button
							type="button"
							onClick={handleToggleNav}
							className="ml-auto rounded-md border border-secondary-300 px-3 py-1.5 text-xs text-primary-800"
						>
							{navigating ? "Resolve" : "Simulate nav"}
						</button>
					</div>
					<div className="min-h-0 flex-1 overflow-y-auto p-6">
						<p className="text-sm text-secondary-700">
							Page content owns its own scroll inside <code>main</code>.
						</p>
						<div className="mt-4 space-y-3">
							{Array.from({ length: 40 }, (_, i) => (
								<div
									key={`row-${i}`}
									className="rounded-md border border-secondary-200 bg-background p-4 text-sm text-primary-800"
								>
									Row {i + 1}
								</div>
							))}
						</div>
					</div>
				</AppShell>
			</div>
		);
	},
};
