import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScopeChip } from "./scope-chip";

const meta = {
	title: "Components/ScopeChip",
	component: ScopeChip,
	parameters: { layout: "centered" },
} satisfies Meta<typeof ScopeChip>;

export default meta;
type Story = StoryObj<typeof meta>;

const wing = { id: "wing-1", name: "Projects", color: "#5FA8A9" };
const room = { id: "room-1", name: "mempalace-ui" };

export const WingOnly: Story = {
	args: { wing },
};

export const WingWithRoom: Story = {
	args: { wing, room },
};

export const Clearable: Story = {
	args: {
		wing,
		room,
		onClear: () => {},
	},
};

export const LongNames: Story = {
	args: {
		wing: { id: "wing-2", name: "Long-form research notes from 2025", color: "#A89880" },
		room: { id: "room-2", name: "Quarterly synthesis sessions and notes" },
		onClear: () => {},
	},
	render: (args) => (
		<div className="w-64">
			<ScopeChip {...args} />
		</div>
	),
};
