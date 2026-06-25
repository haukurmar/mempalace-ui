import type { Meta, StoryObj } from "@storybook/react-vite";
import { type FC, useState } from "react";
import { SearchField } from "./search-field";
import type { SearchFieldProps } from "./search-field.types";

const meta = {
	title: "Components/SearchField",
	component: SearchField,
	parameters: { layout: "centered" },
	decorators: [
		(Story) => (
			<div className="w-[480px]">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof SearchField>;

export default meta;
type Story = StoryObj<typeof meta>;

const ControlledHarness: FC<Partial<SearchFieldProps> & { initial?: string }> = (props) => {
	const { initial = "", ...rest } = props;
	const [value, setValue] = useState(initial);

	const handleSubmit = (next: string) => {
		// Story-level no-op — Storybook's actions panel captures the call.
		console.log("submit:", next);
	};

	return (
		<SearchField
			value={value}
			onChange={setValue}
			onSubmit={handleSubmit}
			placeholder="Search the palace…"
			ariaLabel="Search the palace"
			formAriaLabel="Palace search"
			{...rest}
		/>
	);
};

export const Empty: Story = {
	args: { value: "", onChange: () => undefined },
	render: () => <ControlledHarness />,
};

export const WithValue: Story = {
	args: { value: "design tokens", onChange: () => undefined },
	render: () => <ControlledHarness initial="design tokens" />,
};

export const Focused: Story = {
	args: { value: "", onChange: () => undefined },
	render: () => <ControlledHarness autoFocus />,
};

export const WithDropdownTrigger: Story = {
	args: { value: "", onChange: () => undefined },
	render: () => (
		<div className="relative">
			<ControlledHarness />
			<div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-md border border-secondary-200 bg-background p-2 text-xs text-secondary-700 shadow-md">
				The page wraps the field with a history dropdown — this story shows the slot exists.
			</div>
		</div>
	),
};
