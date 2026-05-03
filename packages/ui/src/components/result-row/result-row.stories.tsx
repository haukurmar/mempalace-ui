import type { Meta, StoryObj } from "@storybook/react-vite";
import { ResultRow } from "./result-row";

const meta = {
	title: "Components/ResultRow",
	component: ResultRow,
	parameters: { layout: "centered" },
	decorators: [
		(Story) => (
			<div className="w-[640px]">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof ResultRow>;

export default meta;
type Story = StoryObj<typeof meta>;

const wing = { id: "wing-1", name: "Projects", color: "#5FA8A9" };
const room = { id: "room-1", name: "mempalace-ui" };

export const Default: Story = {
	args: {
		result: {
			drawerId: "drawer-1",
			snippet: "Sketched the composed component layer for drawers and result rows.",
			wing,
			room,
			scores: { cosine: 0.84, bm25: 2.13 },
		},
	},
};

export const Selected: Story = {
	args: {
		result: {
			drawerId: "drawer-1",
			snippet: "Sketched the composed component layer for drawers and result rows.",
			wing,
			room,
			scores: { cosine: 0.84, bm25: 2.13 },
		},
		selected: true,
	},
};

export const BothScores: Story = {
	args: {
		result: {
			drawerId: "drawer-2",
			snippet: "Both vector cosine similarity and bm25 lexical score are present on this row.",
			wing,
			room,
			scores: { cosine: 0.91, bm25: 4.27 },
		},
	},
};

export const OnlyCosine: Story = {
	args: {
		result: {
			drawerId: "drawer-3",
			snippet: "Only the cosine score is present, bm25 is omitted from the scores object.",
			wing,
			room,
			scores: { cosine: 0.72 },
		},
	},
};

export const WithHighlight: Story = {
	args: {
		result: {
			drawerId: "drawer-4",
			snippet: "Discussion about **drawer cards** and the composed **result row** layout.",
			wing,
			room,
			scores: { cosine: 0.88, bm25: 3.05 },
		},
	},
};

export const LongSnippet: Story = {
	args: {
		result: {
			drawerId: "drawer-5",
			snippet:
				"This snippet is deliberately verbose to make sure the single-line clamp actually triggers when the search result text exceeds the width of the row container in any reasonable layout.",
			wing,
			room,
			scores: { cosine: 0.66, bm25: 1.42 },
		},
	},
};
