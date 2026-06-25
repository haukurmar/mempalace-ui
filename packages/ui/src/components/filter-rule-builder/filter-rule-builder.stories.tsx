import type { FieldDefinition, Group } from "@memui/ui/components";
import { FilterRuleBuilder, toWhereClause } from "@memui/ui/components";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const fields: FieldDefinition[] = [
	{ name: "wingId", label: "Wing", type: "string" },
	{ name: "roomId", label: "Room", type: "string" },
	{
		name: "miningMode",
		label: "Mining mode",
		type: "string",
		enumValues: ["manual", "auto", "imported", "synthetic"],
	},
	{ name: "createdAt", label: "Created at", type: "date" },
	{ name: "bytes", label: "Bytes", type: "number" },
	{ name: "tags", label: "Tags", type: "string" },
	{ name: "archived", label: "Archived", type: "boolean" },
];

const meta: Meta<typeof FilterRuleBuilder> = {
	title: "Components/FilterRuleBuilder",
	component: FilterRuleBuilder,
	parameters: { layout: "padded" },
	decorators: [
		(Story) => (
			<div className="w-[760px]">
				<Story />
			</div>
		),
	],
};

export default meta;

type Story = StoryObj<typeof FilterRuleBuilder>;

export const Empty: Story = {
	args: {
		fields,
	},
};

export const SingleRule: Story = {
	args: {
		fields,
		value: {
			id: "g-root",
			op: "$and",
			children: [{ id: "r1", field: "wingId", operator: "$eq", value: "convos" }],
		},
	},
};

export const AndGroup: Story = {
	args: {
		fields,
		value: {
			id: "g-root",
			op: "$and",
			children: [
				{ id: "r1", field: "wingId", operator: "$eq", value: "mempalace-ui" },
				{ id: "r2", field: "roomId", operator: "$in", value: ["design", "decision"] },
				{ id: "r3", field: "tags", operator: "$ne", value: "archived" },
			],
		},
	},
};

export const OrGroup: Story = {
	args: {
		fields,
		value: {
			id: "g-root",
			op: "$or",
			children: [
				{ id: "r1", field: "bytes", operator: "$gt", value: 10000 },
				{ id: "r2", field: "bytes", operator: "$lt", value: 100 },
			],
		},
	},
};

export const Nested: Story = {
	args: {
		fields,
		value: {
			id: "g-root",
			op: "$and",
			children: [
				{ id: "r1", field: "wingId", operator: "$eq", value: "convos" },
				{
					id: "g-nested",
					op: "$or",
					children: [
						{ id: "r2", field: "miningMode", operator: "$eq", value: "manual" },
						{ id: "r3", field: "miningMode", operator: "$eq", value: "imported" },
					],
				},
			],
		},
	},
};

export const MixedTypes: Story = {
	args: {
		fields,
		value: {
			id: "g-root",
			op: "$and",
			children: [
				{ id: "r1", field: "wingId", operator: "$eq", value: "personal-notes" },
				{ id: "r2", field: "bytes", operator: "$gte", value: 500 },
				{ id: "r3", field: "createdAt", operator: "$gt", value: "2025-01-01" },
				{ id: "r4", field: "archived", operator: "$eq", value: false },
			],
		},
	},
};

export const WithEnumField: Story = {
	args: {
		fields,
		value: {
			id: "g-root",
			op: "$and",
			children: [{ id: "r1", field: "miningMode", operator: "$in", value: ["manual", "auto"] }],
		},
	},
};

export const ChromaRoundTrip: Story = {
	render: () => {
		const [tree, setTree] = useState<Group>({
			id: "g-root",
			op: "$and",
			children: [
				{ id: "r1", field: "wingId", operator: "$eq", value: "convos" },
				{
					id: "g-nested",
					op: "$or",
					children: [
						{ id: "r2", field: "bytes", operator: "$gt", value: 10000 },
						{ id: "r3", field: "miningMode", operator: "$in", value: ["manual", "imported"] },
					],
				},
			],
		});

		const where = toWhereClause(tree);

		return (
			<div className="flex flex-col gap-3">
				<FilterRuleBuilder fields={fields} value={tree} onChange={setTree} />
				<div className="rounded-md border border-primary-100 bg-secondary-50 p-3">
					<p className="mb-2 font-mono text-xs uppercase tracking-wide text-secondary-700">
						Serialized where clause
					</p>
					<pre className="overflow-auto font-mono text-xs text-primary-900">
						{JSON.stringify(where, null, 2)}
					</pre>
				</div>
			</div>
		);
	},
};
