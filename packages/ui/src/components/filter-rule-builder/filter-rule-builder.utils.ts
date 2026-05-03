import type {
	FieldDefinition,
	FieldType,
	Group,
	GroupOperator,
	Operator,
	Rule,
	RuleValue,
	WhereClause,
} from "./filter-rule-builder.types";

let idCounter = 0;
export const createId = (prefix: string): string => {
	idCounter += 1;
	return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
};

export const STRING_OPERATORS: Operator[] = [
	"$eq",
	"$ne",
	"$contains",
	"$startsWith",
	"$endsWith",
	"$in",
	"$nin",
];

export const NUMERIC_OPERATORS: Operator[] = [
	"$eq",
	"$ne",
	"$gt",
	"$gte",
	"$lt",
	"$lte",
	"$in",
	"$nin",
];

export const BOOLEAN_OPERATORS: Operator[] = ["$eq", "$ne"];

export const operatorsForType = (type: FieldType): Operator[] => {
	switch (type) {
		case "string":
			return STRING_OPERATORS;
		case "number":
		case "date":
			return NUMERIC_OPERATORS;
		case "boolean":
			return BOOLEAN_OPERATORS;
	}
};

export const OPERATOR_LABELS: Record<Operator, string> = {
	$eq: "equals",
	$ne: "not equals",
	$gt: "greater than",
	$gte: "greater or equal",
	$lt: "less than",
	$lte: "less or equal",
	$contains: "contains",
	$startsWith: "starts with",
	$endsWith: "ends with",
	$in: "in",
	$nin: "not in",
};

export const isGroup = (node: Rule | Group): node is Group => {
	return "children" in node && Array.isArray((node as Group).children);
};

export const defaultValueForField = (field: FieldDefinition, operator: Operator): RuleValue => {
	if (operator === "$in" || operator === "$nin") {
		return [];
	}
	if (field.enumValues && field.enumValues.length > 0) {
		return field.enumValues[0] as string;
	}
	switch (field.type) {
		case "boolean":
			return false;
		case "number":
			return 0;
		case "date":
			return new Date().toISOString().slice(0, 10);
		case "string":
			return "";
	}
};

export const createEmptyGroup = (op: GroupOperator = "$and"): Group => ({
	id: createId("grp"),
	op,
	children: [],
});

export const createDefaultRule = (fields: FieldDefinition[]): Rule => {
	const field = fields[0];
	if (!field) {
		return { id: createId("rule"), field: "", operator: "$eq", value: "" };
	}
	const operator = operatorsForType(field.type)[0] ?? "$eq";
	return {
		id: createId("rule"),
		field: field.name,
		operator,
		value: defaultValueForField(field, operator),
	};
};

const ruleToWhere = (rule: Rule): WhereClause | null => {
	if (!rule.field) return null;
	return { [rule.field]: { [rule.operator]: rule.value } };
};

export const toWhereClause = (group: Group): WhereClause | null => {
	const childClauses: WhereClause[] = [];
	for (const child of group.children) {
		if (isGroup(child)) {
			const nested = toWhereClause(child);
			if (nested) childClauses.push(nested);
		} else {
			const clause = ruleToWhere(child);
			if (clause) childClauses.push(clause);
		}
	}
	if (childClauses.length === 0) return null;
	if (childClauses.length === 1) return childClauses[0];
	return { [group.op]: childClauses } as WhereClause;
};

const isLogicalKey = (key: string): key is GroupOperator => key === "$and" || key === "$or";

export const fromWhereClause = (where: WhereClause): Group => {
	const node = parseClause(where);
	if (isGroup(node)) return node;
	return { id: createId("grp"), op: "$and", children: [node] };
};

const parseClause = (where: WhereClause): Rule | Group => {
	const keys = Object.keys(where);
	if (keys.length === 1 && isLogicalKey(keys[0])) {
		const op = keys[0] as GroupOperator;
		const arr = (where as { [k in GroupOperator]: WhereClause[] })[op];
		return {
			id: createId("grp"),
			op,
			children: arr.map(parseClause),
		};
	}
	const field = keys[0];
	const opMap = (where as Record<string, Record<string, unknown>>)[field];
	const operator = Object.keys(opMap)[0] as Operator;
	const value = opMap[operator] as RuleValue;
	return {
		id: createId("rule"),
		field,
		operator,
		value,
	};
};
