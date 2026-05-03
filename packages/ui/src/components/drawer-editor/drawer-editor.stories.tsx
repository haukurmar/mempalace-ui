import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { DrawerEditor } from "./drawer-editor";

const noop = () => {};
const asyncNoop = async () => {};

const meta = {
	title: "Components/DrawerEditor",
	component: DrawerEditor,
	parameters: { layout: "fullscreen" },
	decorators: [
		(Story) => (
			<div className="h-[560px] w-full max-w-5xl p-6">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof DrawerEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleDrawer = `# Conversation: routing layer review

The orbit/cluster/explode tri-mode in the graph view is the spine of palace navigation.
We agreed to:

- treat **layout** as a force-tuning preset, not a separate engine
- expose a *C*-key cycle through the five color modes
- defer the precomputed cluster IDs to a one-shot worker

## Open questions

1. Should cross-wing tunnels glow on hover, always, or behind a toggle?
2. Where do isolation neighborhoods clamp — 2 hops or 3 for noisy wings?

## Tasks

- [x] Sketched the cosmograph benchmark sandbox
- [ ] Wire the precompute worker to MCP \`mempalace_kg_add\`
- [ ] Add \`L\` keybind for "isolate this drawer's neighborhood"

> Reminder: keep the floating control cluster ergonomic for trackpad users.

| Mode    | Force preset       | Color default |
| ------- | ------------------ | ------------- |
| Explode | repulsion 0.9      | wing hue      |
| Orbit   | gravity 0.3        | recency       |
| Cluster | community 0.6      | cluster id    |

\`\`\`ts
const isolateNeighborhood = (drawerId: DrawerId, hops: 2 | 3 = 2) => {
  return graph.bfs(drawerId, hops);
};
\`\`\`
`;

const InteractiveTemplate = (args: Story["args"]) => {
	const [value, setValue] = useState(args?.value ?? "");
	return (
		<DrawerEditor
			{...args}
			value={value}
			onChange={(next) => {
				setValue(next);
				args?.onChange?.(next);
			}}
		/>
	);
};

export const Default: Story = {
	args: {
		value: "# A short drawer\n\nSome notes about the routing decision.",
		onChange: noop,
	},
};

export const Empty: Story = {
	args: {
		value: "",
		onChange: noop,
		placeholder: "Start writing this drawer in markdown…",
	},
};

export const WithMarkdownContent: Story = {
	args: {
		value: sampleDrawer,
		onChange: noop,
	},
};

export const CreateMode: Story = {
	args: {
		value: "",
		mode: "create",
		onChange: noop,
		onSave: asyncNoop,
		onCancel: noop,
		placeholder: "Draft a new drawer in markdown…",
	},
};

export const SourceOnly: Story = {
	args: {
		value: sampleDrawer,
		previewLayout: "source-only",
		onChange: noop,
	},
};

export const PreviewOnly: Story = {
	args: {
		value: sampleDrawer,
		previewLayout: "preview-only",
		onChange: noop,
	},
};

export const Disabled: Story = {
	args: {
		value: sampleDrawer,
		disabled: true,
		onChange: noop,
		onSave: asyncNoop,
		onCancel: noop,
	},
};

export const WithSaveCancel: Story = {
	args: {
		value: sampleDrawer,
		onChange: noop,
		onSave: asyncNoop,
		onCancel: noop,
	},
	render: (args) => <InteractiveTemplate {...args} />,
};
