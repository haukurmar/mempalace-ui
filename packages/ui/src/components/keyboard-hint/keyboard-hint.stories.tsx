import type { Meta, StoryObj } from "@storybook/react-vite";
import { KeyboardHint } from "./keyboard-hint";

const meta: Meta<typeof KeyboardHint> = {
	title: "Components/KeyboardHint",
	component: KeyboardHint,
};

export default meta;

type Story = StoryObj<typeof KeyboardHint>;

export const Default: Story = {
	args: {
		keys: ["Cmd", "K"],
	},
};

export const WithModifierStack: Story = {
	args: {
		keys: ["Cmd", "Shift", "P"],
	},
};

export const Single: Story = {
	args: {
		keys: ["Esc"],
	},
};

export const LetterAndArrow: Story = {
	args: {
		keys: ["Cmd", "Up"],
	},
};

export const ShorthandString: Story = {
	args: {
		keys: "Shift+?",
	},
};
