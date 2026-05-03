import { Button } from "../../primitives";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PlugZap } from "lucide-react";
import { ErrorState } from "./error-state";

const meta: Meta<typeof ErrorState> = {
	title: "Components/ErrorState",
	component: ErrorState,
};

export default meta;

type Story = StoryObj<typeof ErrorState>;

export const Default: Story = {};

export const WithDescription: Story = {
	args: {
		title: "Couldn't open the palace",
		description: "The SQLite file at MEMPAL_PALACE_PATH is missing or unreadable.",
	},
};

export const WithAction: Story = {
	args: {
		title: "MCP bridge offline",
		description: "Read-only browse still works. Reconnect to enable edits.",
		action: <Button size="sm">Reconnect</Button>,
	},
};

export const CustomIcon: Story = {
	args: {
		title: "MCP bridge offline",
		description: "Read-only browse still works. Reconnect to enable edits.",
		icon: <PlugZap className="size-6" aria-hidden="true" />,
		action: <Button size="sm">Reconnect</Button>,
	},
};
