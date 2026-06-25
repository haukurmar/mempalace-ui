// The AST shape (`Operator`, `Rule`, `RuleGroup`, `WhereClause`) is owned
// by `@memui/palace-types/where`. We re-export it here so call-sites that
// already depend on `@memui/ui/components` keep their imports working,
// but there is exactly one definition of the chromadb-grammar AST in the
// repo. The component-prop types below are UI-only and stay local.
import type {
	LogicalOperator,
	Operator,
	Rule,
	RuleGroup,
	WhereClause,
} from "@memui/palace-types/where";

export type { LogicalOperator, Operator, Rule, RuleGroup, WhereClause };

// Backwards-compatible alias: existing call-sites import `Group` from
// the UI barrel. The new canonical name is `RuleGroup`.
export type Group = RuleGroup;
export type GroupOperator = LogicalOperator;

export type FieldType = "string" | "number" | "date" | "boolean";

export type FieldDefinition = {
	name: string;
	label?: string;
	type: FieldType;
	enumValues?: readonly string[];
};

export type RuleValue =
	| string
	| number
	| boolean
	| readonly string[]
	| readonly number[]
	| readonly (string | number | boolean)[];

export type FilterRuleBuilderProps = {
	fields: FieldDefinition[];
	value?: Group;
	onChange?: (next: Group) => void;
	onApply?: (where: WhereClause | null) => void;
	className?: string;
};
