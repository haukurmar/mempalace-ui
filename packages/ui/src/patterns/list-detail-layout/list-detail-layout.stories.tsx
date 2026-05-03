import {
	EmptyState,
	LoadingState,
	MetadataTable,
	ProvenanceFooter,
	ResultRow,
	RoomTree,
	type SearchResult,
	type WingNode,
} from "@memui/ui/components";
import { Input } from "@memui/ui/primitives";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Search } from "lucide-react";
import { ListDetailLayout } from "./list-detail-layout";

const meta: Meta<typeof ListDetailLayout> = {
	title: "Patterns/ListDetailLayout",
	component: ListDetailLayout,
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component:
					"Browse-shaped page archetype. The sidebar slot exposes the palace tree (typically RoomTree); the main slot hosts a scrollable list of drawers or search results (ResultRow, DrawerCard); the optional detail slot slides over from the right with a focused drawer's MetadataTable + ProvenanceFooter. Use this for any browse, search-results, or curation surface — pages slot their own content into each region rather than reinventing grid structure inline.",
			},
		},
	},
	decorators: [
		(Story) => (
			<div className="h-screen w-full">
				<Story />
			</div>
		),
	],
};

export default meta;

type Story = StoryObj<typeof ListDetailLayout>;

const treeData: { wings: WingNode[] } = {
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
	],
};

const wing = { id: "mempalace-ui", name: "mempalace-ui", color: "#5FA8A9" };
const room = { id: "design-system", name: "design-system" };

const sampleResults: SearchResult[] = [
	{
		drawerId: "drawer-1",
		snippet: "Sketched the composed component layer for drawers and result rows.",
		wing,
		room,
		scores: { cosine: 0.84, bm25: 2.13 },
	},
	{
		drawerId: "drawer-2",
		snippet: "Pattern layer hosts ListDetailLayout, GraphPanelLayout, SettingsLayout.",
		wing,
		room,
		scores: { cosine: 0.79, bm25: 1.92 },
	},
	{
		drawerId: "drawer-3",
		snippet: "Density modes via data-density on the document element.",
		wing,
		room,
		scores: { cosine: 0.71, bm25: 1.55 },
	},
	{
		drawerId: "drawer-4",
		snippet: "Discussion about **drawer cards** and the composed **result row** layout.",
		wing,
		room,
		scores: { cosine: 0.88, bm25: 3.05 },
	},
	{
		drawerId: "drawer-5",
		snippet: "Tokens compile to CSS variables; Tailwind preset reads the same source.",
		wing,
		room,
		scores: { cosine: 0.62, bm25: 1.18 },
	},
];

const sampleSidebar = (
	<div className="p-2">
		<RoomTree data={treeData} expandedIds={new Set(["mempalace-ui"])} selectedId="design-system" />
	</div>
);

const sampleMain = (
	<div className="flex flex-col gap-1 p-3">
		{sampleResults.map((result) => (
			<ResultRow key={result.drawerId} result={result} />
		))}
	</div>
);

const sampleDetail = (
	<div className="flex flex-col gap-4 p-4">
		<header className="flex flex-col gap-1">
			<p className="text-xs uppercase tracking-wide text-secondary-600">Drawer</p>
			<h2 className="text-lg font-semibold text-primary-900">
				Sketched the composed component layer for drawers and result rows.
			</h2>
		</header>
		<MetadataTable
			data={{
				drawerId: "drawer-1",
				wing: "mempalace-ui",
				room: "design-system",
				bytes: 4821,
				mode: "manual",
			}}
		/>
		<ProvenanceFooter
			provenance={{
				createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8),
				updatedAt: new Date(Date.now() - 1000 * 60 * 12),
				sourcePath: "/Users/dev/projects/mempalace-ui/notes/design-system.md",
				miningMode: "manual",
			}}
		/>
	</div>
);

const sampleHeader = (
	<div className="flex w-full items-center gap-2">
		<Search aria-hidden="true" className="size-4 text-secondary-600" />
		<Input placeholder="Search the palace…" className="max-w-md" />
	</div>
);

export const Default: Story = {
	args: {
		sidebar: sampleSidebar,
		main: sampleMain,
	},
};

export const WithDetail: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Detail panel slides in from the right. On large viewports it occupies ~45% of the available width; on smaller viewports it covers the full width with a backdrop overlay click-target for dismissal.",
			},
		},
	},
	args: {
		sidebar: sampleSidebar,
		main: sampleMain,
		detail: sampleDetail,
		detailOpen: true,
	},
};

export const WithHeader: Story = {
	args: {
		sidebar: sampleSidebar,
		main: sampleMain,
		header: sampleHeader,
	},
};

export const EmptyMain: Story = {
	args: {
		sidebar: sampleSidebar,
		main: (
			<EmptyState
				title="No drawers in this room"
				description="Mine a project or a conversation to start filling this room with memories."
			/>
		),
	},
};

export const LoadingMain: Story = {
	args: {
		sidebar: sampleSidebar,
		main: <LoadingState label="Loading drawers…" />,
	},
};
