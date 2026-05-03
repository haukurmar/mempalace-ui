import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProvenanceFooter, type MiningMode } from "./provenance-footer";

const meta = {
	title: "Components/ProvenanceFooter",
	component: ProvenanceFooter,
	parameters: { layout: "padded" },
} satisfies Meta<typeof ProvenanceFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

const TWO_HOURS_AGO = new Date(Date.now() - 1000 * 60 * 60 * 2);
const THIRTY_MINUTES_AGO = new Date(Date.now() - 1000 * 60 * 30);
const FIVE_DAYS_AGO = new Date(Date.now() - 1000 * 60 * 60 * 24 * 5);
const SIX_MONTHS_AGO = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 6);

export const Default: Story = {
	args: {
		provenance: {
			createdAt: TWO_HOURS_AGO,
			sourcePath: "~/code/mempalace-ui/notes.md",
			miningMode: "manual",
		},
	},
};

export const WithUpdatedAt: Story = {
	args: {
		provenance: {
			createdAt: TWO_HOURS_AGO,
			updatedAt: THIRTY_MINUTES_AGO,
			sourcePath: "~/code/mempalace-ui/openspec/changes/bootstrap-mempalace-ui/tasks.md",
			miningMode: "auto",
		},
	},
};

export const LongSourcePath: Story = {
	args: {
		provenance: {
			createdAt: FIVE_DAYS_AGO,
			sourcePath:
				"/Users/hawk/Work/haukurmar/mempalace-ui/openspec/changes/bootstrap-mempalace-ui/specs/design-system/spec.md",
			miningMode: "imported",
		},
	},
	render: (args) => (
		<div className="w-[36rem]">
			<ProvenanceFooter {...args} />
		</div>
	),
};

const miningModes: MiningMode[] = ["manual", "auto", "imported", "synthetic"];

export const EachMiningMode: Story = {
	args: {
		provenance: {
			createdAt: TWO_HOURS_AGO,
			sourcePath: "~/code/mempalace-ui/notes.md",
			miningMode: "manual",
		},
	},
	render: () => (
		<div className="flex w-full flex-col gap-3">
			{miningModes.map((mode) => (
				<ProvenanceFooter
					key={mode}
					provenance={{
						createdAt: TWO_HOURS_AGO,
						sourcePath: "~/code/mempalace-ui/notes.md",
						miningMode: mode,
					}}
				/>
			))}
		</div>
	),
};

export const OldDrawer: Story = {
	args: {
		provenance: {
			createdAt: SIX_MONTHS_AGO,
			updatedAt: SIX_MONTHS_AGO,
			sourcePath: "~/archive/2025-q4/journal.md",
			miningMode: "imported",
		},
	},
};
