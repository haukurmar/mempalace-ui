import type { Meta, StoryObj } from "@storybook/react-vite";
import { Boxes, Home, Network, Search, Settings } from "lucide-react";
import { useState } from "react";
import { AppRail } from "./app-rail";
import type { RailItemData } from "./rail-item";

const items: RailItemData[] = [
	{ id: "home", icon: <Home />, label: "Observatory", keyHint: ["g", "h"] },
	{ id: "browse", icon: <Boxes />, label: "Browse", keyHint: ["g", "b"] },
	{ id: "search", icon: <Search />, label: "Search", keyHint: ["/"] },
	{ id: "graph", icon: <Network />, label: "Graph", keyHint: ["g", "g"] },
	{ id: "settings", icon: <Settings />, label: "Settings", keyHint: ["g", "s"] },
];

const meta: Meta<typeof AppRail> = {
	title: "Components/AppRail",
	component: AppRail,
	parameters: { layout: "fullscreen" },
	decorators: [
		(Story) => (
			<div className="flex h-screen bg-primary-1000">
				<Story />
				<div className="flex-1" />
			</div>
		),
	],
};

export default meta;

type Story = StoryObj<typeof AppRail>;

const handleCommand = () => {
	// no-op in stories
};

const handleToggle = () => {
	// no-op in stories — the Interactive story owns real toggle state
};

/** Default state: expanded (labels visible). The toggle button sits at the
 *  top-left; the footer shows the full ⌘ + K affordance. */
export const Expanded: Story = {
	args: {
		items,
		activeId: "home",
		expanded: true,
		onToggleExpanded: handleToggle,
		onCommandPalette: handleCommand,
	},
};

/** Collapsed to the icon-only sliver. The ⌘ + K chips stay fully visible and
 *  centered — never cramped. */
export const Collapsed: Story = {
	args: {
		items,
		activeId: "browse",
		expanded: false,
		onToggleExpanded: handleToggle,
		onCommandPalette: handleCommand,
	},
};

export const Compact: Story = {
	args: {
		items,
		activeId: "search",
		density: "compact",
		expanded: false,
		onToggleExpanded: handleToggle,
		onCommandPalette: handleCommand,
	},
};

export const WithActiveItem: Story = {
	args: {
		items,
		activeId: "graph",
		expanded: true,
		onToggleExpanded: handleToggle,
		onCommandPalette: handleCommand,
	},
};

/** Click the top-left toggle to collapse/expand; click an item to move the
 *  active selection. Mirrors how the app wires `expanded` + `onToggleExpanded`
 *  and `activeId` + `onSelect` to its router and persisted state. */
export const Interactive: Story = {
	render: () => {
		const [activeId, setActiveId] = useState("home");
		const [expanded, setExpanded] = useState(true);

		const handleSelect = (id: string) => {
			setActiveId(id);
		};

		const handleToggleExpanded = () => {
			setExpanded((prev) => !prev);
		};

		return (
			<AppRail
				items={items}
				activeId={activeId}
				expanded={expanded}
				onToggleExpanded={handleToggleExpanded}
				onSelect={handleSelect}
				onCommandPalette={handleCommand}
			/>
		);
	},
};
