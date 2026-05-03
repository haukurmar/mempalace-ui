import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	Activity,
	Compass,
	FolderOpen,
	GitBranch,
	Keyboard,
	Plug,
	RefreshCw,
	Search,
	SlidersHorizontal,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@memui/ui/primitives";
import { CommandBar, type CommandAction } from "./command-bar";

const noop = () => {};

const navigateActions: CommandAction[] = [
	{
		id: "nav-browse",
		label: "Open browse",
		description: "Browse drawers by wing and room",
		icon: <FolderOpen />,
		group: "Navigate",
		keywords: ["wings", "rooms", "explore"],
		run: noop,
	},
	{
		id: "nav-search",
		label: "Open search",
		description: "Semantic search across the palace",
		icon: <Search />,
		group: "Navigate",
		run: noop,
	},
	{
		id: "nav-graph",
		label: "Open graph view",
		description: "Force-directed view of the palace",
		icon: <GitBranch />,
		group: "Navigate",
		run: noop,
	},
];

const drawerActions: CommandAction[] = [
	{
		id: "drawer-add",
		label: "Add drawer",
		description: "Create a new drawer in the active room",
		icon: <FolderOpen />,
		group: "Drawer",
		run: noop,
	},
	{
		id: "drawer-delete",
		label: "Delete selected drawer",
		description: "Remove the selected drawer with confirmation",
		group: "Drawer",
		run: noop,
	},
];

const palaceActions: CommandAction[] = [
	{
		id: "palace-refresh",
		label: "Refresh palace health",
		description: "Recompute the most recent health score",
		icon: <Activity />,
		group: "Palace",
		run: noop,
	},
	{
		id: "palace-reconnect",
		label: "Reconnect to palace",
		description: "Re-probe SQLite + MCP transports",
		icon: <Plug />,
		group: "Palace",
		run: noop,
	},
];

const utilityActions: CommandAction[] = [
	{
		id: "util-density",
		label: "Toggle density",
		description: "Switch between cozy / compact / dense",
		icon: <SlidersHorizontal />,
		group: "Settings",
		run: noop,
	},
	{
		id: "util-cheatsheet",
		label: "Open keyboard cheatsheet",
		description: "Auto-generated from the keyboard registry",
		icon: <Keyboard />,
		group: "Settings",
		run: noop,
	},
];

const flatActions: CommandAction[] = [
	{ id: "browse", label: "Open browse", run: noop },
	{ id: "search", label: "Open search", run: noop },
	{ id: "graph", label: "Open graph view", run: noop },
	{ id: "refresh", label: "Refresh palace health", run: noop },
	{ id: "reconnect", label: "Reconnect to palace", run: noop },
];

const groupedActions: CommandAction[] = [
	...navigateActions,
	...drawerActions,
	...palaceActions,
	...utilityActions,
];

const shortcutActions: CommandAction[] = [
	{
		id: "go-browse",
		label: "Go to browse",
		shortcut: ["G", "B"],
		group: "Navigate",
		run: noop,
	},
	{
		id: "go-search",
		label: "Go to search",
		shortcut: ["G", "S"],
		group: "Navigate",
		run: noop,
	},
	{
		id: "refresh",
		label: "Refresh",
		description: "Re-run the active query",
		shortcut: ["Cmd", "R"],
		icon: <RefreshCw />,
		group: "Actions",
		run: noop,
	},
	{
		id: "command",
		label: "Command palette",
		shortcut: ["Cmd", "K"],
		group: "Actions",
		run: noop,
	},
];

const iconActions: CommandAction[] = [
	{
		id: "browse",
		label: "Open browse",
		icon: <Compass />,
		run: noop,
	},
	{
		id: "search",
		label: "Open search",
		icon: <Search />,
		run: noop,
	},
	{
		id: "graph",
		label: "Open graph view",
		icon: <GitBranch />,
		run: noop,
	},
	{
		id: "refresh",
		label: "Refresh palace health",
		icon: <Activity />,
		run: noop,
	},
	{
		id: "reconnect",
		label: "Reconnect",
		icon: <Plug />,
		run: noop,
	},
];

type ControlledStoryProps = {
	actions: CommandAction[];
	recents?: ReadonlyArray<string>;
	onRunAction?: (id: string) => void;
};

const ControlledStory = (props: ControlledStoryProps) => {
	const { actions, recents, onRunAction } = props;
	const [open, setOpen] = useState(true);
	const [recentIds, setRecentIds] = useState<string[]>(recents ? [...recents] : []);

	const handleRecent = (id: string) => {
		onRunAction?.(id);
		setRecentIds((prev) => [id, ...prev.filter((existing) => existing !== id)].slice(0, 5));
	};

	const handleOpenPalette = () => {
		setOpen(true);
	};

	return (
		<div className="flex flex-col items-center gap-4">
			<Button onClick={handleOpenPalette}>Open command bar</Button>
			<p className="text-xs text-secondary-700">
				Recents: {recentIds.length === 0 ? "(none)" : recentIds.join(", ")}
			</p>
			<CommandBar
				actions={actions}
				open={open}
				onOpenChange={setOpen}
				recents={recentIds}
				onRecent={handleRecent}
			/>
		</div>
	);
};

const meta = {
	title: "Components/CommandBar",
	component: CommandBar,
	parameters: { layout: "centered" },
} satisfies Meta<typeof CommandBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
	args: { actions: flatActions },
	render: (args) => <ControlledStory actions={args.actions} />,
};

export const WithGroups: Story = {
	args: { actions: groupedActions },
	render: (args) => <ControlledStory actions={args.actions} />,
};

export const WithShortcuts: Story = {
	args: { actions: shortcutActions },
	render: (args) => <ControlledStory actions={args.actions} />,
};

export const WithIcons: Story = {
	args: { actions: iconActions },
	render: (args) => <ControlledStory actions={args.actions} />,
};

export const WithRecents: Story = {
	args: { actions: groupedActions, recents: ["palace-refresh", "nav-search"] },
	render: (args) => <ControlledStory actions={args.actions} recents={args.recents} />,
};

export const Filtering: Story = {
	args: { actions: groupedActions },
	render: (args) => <ControlledStory actions={args.actions} />,
};

const runAndCloseActions: CommandAction[] = [
	{
		id: "demo-run",
		label: "Run mock action",
		description: "Fires a console.log handler and closes the palette",
		icon: <Activity />,
		run: () => {
			console.log("CommandBar: demo-run executed");
		},
	},
	{
		id: "demo-secondary",
		label: "Another action",
		run: () => {
			console.log("CommandBar: demo-secondary executed");
		},
	},
];

const handleRunAction = (id: string) => {
	console.log("CommandBar: ran", id);
};

export const RunAndClose: Story = {
	args: { actions: runAndCloseActions },
	render: (args) => <ControlledStory actions={args.actions} onRunAction={handleRunAction} />,
};
