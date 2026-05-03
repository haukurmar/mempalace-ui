import type { Meta, StoryObj } from "@storybook/react-vite";
import { DrawerCard } from "./drawer-card";

const meta = {
	title: "Components/DrawerCard",
	component: DrawerCard,
	parameters: { layout: "centered" },
	decorators: [
		(Story) => (
			<div className="w-80">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof DrawerCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const wing = { id: "wing-1", name: "Projects", color: "#5FA8A9" };
const room = { id: "room-1", name: "mempalace-ui" };
const baseSnippet =
	"Sketched the composed component layer: drawer card, result row, room tree. Need to revisit density tokens after the first round of stories.";
const createdAt = new Date(Date.now() - 3 * 60 * 60 * 1000);

export const Default: Story = {
	args: {
		drawer: {
			id: "drawer-1",
			contentSnippet: baseSnippet,
			wing,
			room,
			createdAt,
			bytes: 2458,
		},
	},
};

export const Selected: Story = {
	args: {
		drawer: {
			id: "drawer-1",
			contentSnippet: baseSnippet,
			wing,
			room,
			createdAt,
			bytes: 2458,
		},
		selected: true,
	},
};

export const Compact: Story = {
	args: {
		drawer: {
			id: "drawer-1",
			contentSnippet: baseSnippet,
			wing,
			room,
			createdAt,
			bytes: 2458,
		},
		density: "compact",
	},
};

export const WithoutRoom: Story = {
	args: {
		drawer: {
			id: "drawer-2",
			contentSnippet: "A wing-level note that has not been filed into any room yet.",
			wing: { id: "wing-2", name: "Conversations", color: "#A89880" },
			createdAt: new Date(Date.now() - 30 * 60 * 1000),
		},
	},
};

export const LongSnippet: Story = {
	args: {
		drawer: {
			id: "drawer-3",
			contentSnippet:
				"This snippet is intentionally long enough to overflow the two-line clamp so we can verify truncation behaviour. It keeps going, talking about palace structure, drawer schemas, wing colors, room hierarchies, and a number of other concerns relevant to the mempalace-ui design system that should never make it onto a single card surface.",
			wing,
			room,
			createdAt,
			bytes: 8421,
		},
	},
};

export const Clickable: Story = {
	args: {
		drawer: {
			id: "drawer-4",
			contentSnippet: baseSnippet,
			wing,
			room,
			createdAt,
			bytes: 2458,
		},
		onSelect: (id) => {
			console.log("selected drawer", id);
		},
	},
};
