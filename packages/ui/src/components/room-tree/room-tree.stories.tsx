import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { RoomTree, type RoomTreeData } from "./room-tree";

const meta: Meta<typeof RoomTree> = {
	title: "Components/RoomTree",
	component: RoomTree,
	parameters: { layout: "padded" },
	decorators: [
		(Story) => (
			<div className="w-72 rounded-md border border-primary-100 bg-background p-2">
				<Story />
			</div>
		),
	],
};

export default meta;

type Story = StoryObj<typeof RoomTree>;

const singleWing: RoomTreeData = {
	wings: [
		{
			id: "mempalace-ui",
			name: "mempalace-ui",
			color: "#5FA8A9",
			drawerCount: 142,
			rooms: [
				{ id: "general", name: "general", drawerCount: 42 },
				{ id: "stack-decisions", name: "stack-decisions", drawerCount: 18 },
				{ id: "design-system", name: "design-system", drawerCount: 56 },
				{ id: "ux-notes", name: "ux-notes", drawerCount: 14 },
				{ id: "performance", name: "performance", drawerCount: 12 },
			],
		},
	],
};

const manyWings: RoomTreeData = {
	wings: [
		{
			id: "mempalace-ui",
			name: "mempalace-ui",
			color: "#5FA8A9",
			drawerCount: 142,
			rooms: [
				{ id: "ui-general", name: "general", drawerCount: 42 },
				{ id: "ui-stack-decisions", name: "stack-decisions", drawerCount: 18 },
				{ id: "ui-design-system", name: "design-system", drawerCount: 56 },
			],
		},
		{
			id: "tabula",
			name: "tabula",
			color: "#A89880",
			drawerCount: 87,
			rooms: [
				{ id: "tab-general", name: "general", drawerCount: 30 },
				{ id: "tab-research", name: "research", drawerCount: 57 },
			],
		},
		{
			id: "kirkjuappid",
			name: "kirkjuappid",
			color: "#C97B63",
			drawerCount: 53,
			rooms: [
				{ id: "kirkju-general", name: "general", drawerCount: 21 },
				{ id: "kirkju-feature-flags", name: "feature-flags", drawerCount: 32 },
			],
		},
		{
			id: "personal-notes",
			name: "personal-notes",
			color: "#7A8E5C",
			drawerCount: 211,
			rooms: [
				{ id: "pn-general", name: "general", drawerCount: 80 },
				{ id: "pn-reading", name: "reading", drawerCount: 64 },
				{ id: "pn-journal", name: "journal", drawerCount: 67 },
			],
		},
		{
			id: "convos",
			name: "convos",
			color: "#8E6FA0",
			drawerCount: 412,
			rooms: [
				{ id: "convos-claude", name: "claude", drawerCount: 280 },
				{ id: "convos-codex", name: "codex", drawerCount: 132 },
			],
		},
		{
			id: "papers",
			name: "papers",
			color: "#D4A24C",
			drawerCount: 68,
			rooms: [
				{ id: "papers-ml", name: "ml", drawerCount: 41 },
				{ id: "papers-systems", name: "systems", drawerCount: 27 },
			],
		},
		{
			id: "recipes",
			name: "recipes",
			color: "#B5524C",
			drawerCount: 24,
			rooms: [{ id: "recipes-general", name: "general", drawerCount: 24 }],
		},
		{
			id: "scratch",
			name: "scratch",
			color: "#6B7280",
			drawerCount: 9,
			rooms: [{ id: "scratch-general", name: "general", drawerCount: 9 }],
		},
	],
};

const largePalace: RoomTreeData = {
	wings: [
		{
			id: "personal-notes",
			name: "personal-notes",
			color: "#7A8E5C",
			drawerCount: 1234,
			rooms: Array.from({ length: 32 }, (_, i) => ({
				id: `pn-room-${i}`,
				name: `room-${String(i).padStart(2, "0")}`,
				drawerCount: 10 + ((i * 17) % 200),
			})),
		},
	],
};

export const Empty: Story = {
	args: {
		data: { wings: [] },
	},
};

export const SingleWingSeveralRooms: Story = {
	args: {
		data: singleWing,
		expandedIds: new Set(["mempalace-ui"]),
	},
};

export const ManyWings: Story = {
	args: {
		data: manyWings,
	},
};

export const Expanded: Story = {
	args: {
		data: manyWings,
		expandedIds: new Set(["mempalace-ui", "personal-notes"]),
	},
};

export const Selected: Story = {
	args: {
		data: manyWings,
		expandedIds: new Set(["mempalace-ui"]),
		selectedId: "ui-design-system",
	},
};

export const Compact: Story = {
	args: {
		data: manyWings,
		expandedIds: new Set(["mempalace-ui", "tabula"]),
		density: "compact",
	},
};

export const LargePalace: Story = {
	args: {
		data: largePalace,
		expandedIds: new Set(["personal-notes"]),
		density: "compact",
	},
};

export const Interactive: Story = {
	render: () => {
		const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
		const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(["mempalace-ui"]));

		const handleSelect = (id: string) => {
			setSelectedId(id);
		};

		const handleToggle = (id: string) => {
			setExpandedIds((prev) => {
				const next = new Set(prev);
				if (next.has(id)) next.delete(id);
				else next.add(id);
				return next;
			});
		};

		return (
			<RoomTree
				data={manyWings}
				selectedId={selectedId}
				expandedIds={expandedIds}
				onSelect={handleSelect}
				onToggle={handleToggle}
			/>
		);
	},
};
