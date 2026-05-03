export type FieldType = "string" | "number" | "date" | "boolean";

export type FieldDefinition = {
	name: string;
	label?: string;
	type: FieldType;
	enumValues?: readonly string[];
};

export type Operator =
	| "$eq"
	| "$ne"
	| "$gt"
	| "$gte"
	| "$lt"
	| "$lte"
	| "$contains"
	| "$startsWith"
	| "$endsWith"
	| "$in"
	| "$nin";

export type RuleValue = string | number | boolean | string[] | number[];

export type Rule = {
	id: string;
	field: string;
	operator: Operator;
	value: RuleValue;
};

export type GroupOperator = "$and" | "$or";

export type Group = {
	id: string;
	op: GroupOperator;
	children: ReadonlyArray<Rule | Group>;
};

export type WhereClause =
	| { [field: string]: { [op: string]: unknown } }
	| { $and: WhereClause[] }
	| { $or: WhereClause[] };

export type FilterRuleBuilderProps = {
	fields: FieldDefinition[];
	value?: Group;
	onChange?: (next: Group) => void;
	onApply?: (where: WhereClause | null) => void;
	className?: string;
};
