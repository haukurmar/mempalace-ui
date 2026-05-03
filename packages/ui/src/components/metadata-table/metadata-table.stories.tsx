import type { Meta, StoryObj } from "@storybook/react-vite";
import { MetadataTable, type MetadataRecord } from "./metadata-table";

const meta = {
	title: "Components/MetadataTable",
	component: MetadataTable,
	parameters: { layout: "padded" },
} satisfies Meta<typeof MetadataTable>;

export default meta;
type Story = StoryObj<typeof meta>;

const flatRecord: MetadataRecord = {
	wingId: "wing-projects",
	roomId: "room-mempalace-ui",
	sourcePath: "~/code/mempalace-ui/openspec/changes/bootstrap-mempalace-ui/tasks.md",
	miningMode: "manual",
	embeddingNorm: 0.8732,
	minedAt: 1735689600000,
};

const nestedRecord: MetadataRecord = {
	wingId: "wing-projects",
	roomId: "room-mempalace-ui",
	provenance: {
		source: "convo-export",
		scrapedAt: "2026-04-12T10:32:00Z",
		agent: "claude-opus-4-7",
	},
	closetIds: ["closet-design-system", "closet-bootstrap"],
	tunnelIds: ["tunnel-1abc", "tunnel-2def"],
};

const longString =
	"The mempalace-ui design system layers tokens, primitives, composed components, and patterns to keep every screen consistent across browse, search, and graph surfaces. Long descriptive strings like this one stress the truncation and copy-button behavior to make sure dev-tool-grade metadata stays scannable without losing access to the full value when needed.";

const largeRecord: MetadataRecord = Object.fromEntries(
	Array.from({ length: 32 }, (_, index) => [
		`field_${String(index).padStart(2, "0")}`,
		index % 3 === 0
			? `value-${index}-${"alpha".repeat(2)}`
			: index % 3 === 1
				? index * 17
				: index % 2 === 0,
	]),
) as MetadataRecord;

const mixedRecord: MetadataRecord = {
	wingId: "wing-conversations",
	roomId: null,
	isPinned: true,
	isArchived: false,
	embeddingNorm: 0.4128194,
	closetIds: ["closet-1", "closet-2", "closet-3"],
	provenance: {
		source: "manual",
		scrapedAt: "2026-04-30T19:21:00Z",
		nested: {
			tool: "mempalace-cli",
			version: "3.3.4",
		},
	},
	summary: longString,
};

export const Default: Story = {
	args: {
		data: flatRecord,
	},
};

export const WithNestedObject: Story = {
	args: {
		data: nestedRecord,
	},
};

export const WithLargeValueCount: Story = {
	args: {
		data: largeRecord,
	},
	render: (args) => (
		<div className="h-96 w-full overflow-auto">
			<MetadataTable {...args} />
		</div>
	),
};

export const WithLongString: Story = {
	args: {
		data: {
			snippet: longString,
			sourcePath: "~/code/mempalace-ui/notes.md",
		},
	},
};

export const WithMixedTypes: Story = {
	args: {
		data: mixedRecord,
	},
};

export const Dense: Story = {
	args: {
		data: nestedRecord,
		dense: true,
	},
};
