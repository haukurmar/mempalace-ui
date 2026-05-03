import tailwindcss from "@tailwindcss/vite";
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
	framework: "@storybook/react-vite",
	stories: ["../../../packages/ui/src/**/*.stories.@(ts|tsx)"],
	addons: [],
	viteFinal: async (config) => {
		config.plugins = [...(config.plugins ?? []), tailwindcss()];
		return config;
	},
};

export default config;
