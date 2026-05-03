import type { Meta, StoryObj } from "@storybook/react-vite";
import { LoadingState } from "./loading-state";

const meta: Meta<typeof LoadingState> = {
	title: "Components/LoadingState",
	component: LoadingState,
};

export default meta;

type Story = StoryObj<typeof LoadingState>;

export const Default: Story = {};

export const WithLabel: Story = {
	args: {
		label: "Loading drawers…",
	},
};

export const WithDescription: Story = {
	args: {
		label: "Opening the palace",
		description: "Probing SQLite and the MCP bridge — this is usually instant.",
	},
};
