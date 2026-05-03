import { Button } from "@memui/ui/primitives";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Archive } from "lucide-react";
import { EmptyState } from "./empty-state";

const meta: Meta<typeof EmptyState> = {
	title: "Components/EmptyState",
	component: EmptyState,
};

export default meta;

type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
	args: {
		title: "No drawers in this room",
	},
};

export const WithDescription: Story = {
	args: {
		title: "No drawers in this room",
		description: "Mine a project or a conversation to start filling this room with memories.",
	},
};

export const WithAction: Story = {
	args: {
		title: "No drawers in this room",
		description: "Mine a project or a conversation to start filling this room with memories.",
		action: <Button size="sm">Open mining workflow</Button>,
	},
};

export const CustomIcon: Story = {
	args: {
		title: "Closet is empty",
		description: "Drag drawers in or run a search to populate this closet.",
		icon: <Archive className="size-6" aria-hidden="true" />,
	},
};
