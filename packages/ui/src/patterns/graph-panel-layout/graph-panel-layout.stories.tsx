import { EmptyState, LoadingState, MetadataTable, ProvenanceFooter } from "@memui/ui/components";
import { Button, Toggle } from "@memui/ui/primitives";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Network, Palette, RotateCcw } from "lucide-react";
import { GraphPanelLayout } from "./graph-panel-layout";

const meta: Meta<typeof GraphPanelLayout> = {
	title: "Patterns/GraphPanelLayout",
	component: GraphPanelLayout,
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component:
					"Graph-canvas page archetype. The canvas slot fills the viewport (eventually a cosmograph WebGL canvas of the palace knowledge graph); the controls slot anchors a small floating cluster in the top-right corner (mode toggle, color mode, layout reset); the bottomPanel slot slides up over the canvas to reveal a focused drawer's MetadataTable + ProvenanceFooter when a node is clicked. Use this for any graph-shaped exploration surface.",
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

type Story = StoryObj<typeof GraphPanelLayout>;

const sampleCanvas = (
	<div className="relative h-full w-full bg-gradient-to-br from-primary-50 via-secondary-50 to-secondary-100">
		<svg
			aria-label="Toy graph"
			role="img"
			className="absolute inset-0 h-full w-full"
			viewBox="0 0 800 600"
			preserveAspectRatio="xMidYMid meet"
		>
			<title>Toy graph preview</title>
			<g stroke="#5FA8A9" strokeOpacity="0.4" strokeWidth="1">
				<line x1="200" y1="200" x2="400" y2="300" />
				<line x1="400" y1="300" x2="600" y2="200" />
				<line x1="400" y1="300" x2="350" y2="450" />
				<line x1="400" y1="300" x2="500" y2="450" />
				<line x1="200" y1="200" x2="250" y2="380" />
				<line x1="600" y1="200" x2="650" y2="380" />
			</g>
			<g fill="#5FA8A9">
				<circle cx="200" cy="200" r="10" />
				<circle cx="400" cy="300" r="14" />
				<circle cx="600" cy="200" r="10" />
				<circle cx="350" cy="450" r="8" />
				<circle cx="500" cy="450" r="8" />
				<circle cx="250" cy="380" r="6" />
				<circle cx="650" cy="380" r="6" />
			</g>
		</svg>
	</div>
);

const sampleControls = (
	<>
		<Toggle aria-label="Toggle graph mode" size="sm" variant="outline">
			<Network aria-hidden="true" className="size-4" />
		</Toggle>
		<Toggle aria-label="Color mode" size="sm" variant="outline">
			<Palette aria-hidden="true" className="size-4" />
		</Toggle>
		<Button size="sm" variant="outline">
			<RotateCcw aria-hidden="true" className="size-4" />
			<span>Reset layout</span>
		</Button>
	</>
);

const sampleBottomPanel = (
	<div className="flex flex-col gap-4 p-4">
		<header className="flex flex-col gap-1">
			<p className="text-xs uppercase tracking-wide text-secondary-600">Focused drawer</p>
			<h2 className="text-base font-semibold text-primary-900">
				Pattern layer hosts ListDetailLayout, GraphPanelLayout, SettingsLayout.
			</h2>
		</header>
		<MetadataTable
			data={{
				drawerId: "drawer-2",
				wing: "mempalace-ui",
				room: "design-system",
				neighbors: 7,
			}}
			dense
		/>
		<ProvenanceFooter
			provenance={{
				createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
				updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
				sourcePath: "/Users/dev/projects/mempalace-ui/notes/patterns.md",
				miningMode: "auto",
			}}
		/>
	</div>
);

export const Default: Story = {
	args: {
		canvas: sampleCanvas,
		controls: sampleControls,
	},
};

export const WithBottomPanel: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Bottom panel slides up over the canvas with a translucent backdrop tint so the graph stays partly visible behind it.",
			},
		},
	},
	args: {
		canvas: sampleCanvas,
		controls: sampleControls,
		bottomPanel: sampleBottomPanel,
		bottomPanelOpen: true,
	},
};

export const Empty: Story = {
	args: {
		canvas: (
			<div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
				<EmptyState
					title="No drawers to graph yet"
					description="Mine a project or conversation first — the graph view needs at least a few drawers and tunnels to render."
				/>
			</div>
		),
		controls: sampleControls,
	},
};

export const Loading: Story = {
	args: {
		canvas: (
			<div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
				<LoadingState label="Building graph…" description="Loading drawers and tunnels." />
			</div>
		),
		controls: sampleControls,
	},
};
