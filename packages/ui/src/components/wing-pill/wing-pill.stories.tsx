import type { Meta, StoryObj } from "@storybook/react-vite";
import { WingPill } from "./wing-pill";

const meta = {
	title: "Components/WingPill",
	component: WingPill,
	parameters: { layout: "centered" },
} satisfies Meta<typeof WingPill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		wing: { id: "wing-1", name: "Projects", color: "#5FA8A9" },
	},
};

export const Compact: Story = {
	args: {
		wing: { id: "wing-1", name: "Projects", color: "#5FA8A9" },
		compact: true,
	},
};

export const WithoutColor: Story = {
	args: {
		wing: { id: "wing-2", name: "Conversations" },
	},
};

export const LongName: Story = {
	args: {
		wing: {
			id: "wing-3",
			name: "Long-form research notes from 2025",
			color: "#A89880",
		},
	},
	render: (args) => (
		<div className="w-40">
			<WingPill {...args} />
		</div>
	),
};
