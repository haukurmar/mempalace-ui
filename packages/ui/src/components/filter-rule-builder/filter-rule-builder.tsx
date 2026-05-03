import { ClipboardCopy, Download, Plus, Trash2, X } from "lucide-react";
import { type FC, type KeyboardEvent, useCallback, useState } from "react";
import { Button } from "../../primitives/button";
import { Input } from "../../primitives/input";
import { Popover, PopoverContent, PopoverTrigger } from "../../primitives/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../../primitives/select";
import { cn } from "../../lib/utils";
import type {
	FieldDefinition,
	FilterRuleBuilderProps,
	Group,
	GroupOperator,
	Operator,
	Rule,
	RuleValue,
} from "./filter-rule-builder.types";
import {
	createDefaultRule,
	createEmptyGroup,
	defaultValueForField,
	fromWhereClause,
	isGroup,
	OPERATOR_LABELS,
	operatorsForType,
	toWhereClause,
} from "./filter-rule-builder.utils";

export const FilterRuleBuilder: FC<FilterRuleBuilderProps> = (props) => {
	const { fields, value, onChange, onApply, className } = props;

	const isControlled = value !== undefined;
	const [internalRoot, setInternalRoot] = useState<Group>(() => createEmptyGroup("$and"));
	const root = isControlled ? value : internalRoot;

	const updateRoot = useCallback(
		(next: Group) => {
			if (!isControlled) setInternalRoot(next);
			onChange?.(next);
		},
		[isControlled, onChange],
	);

	const handleApply = () => {
		onApply?.(toWhereClause(root));
	};

	const handleCopy = async () => {
		const where = toWhereClause(root);
		const text = where ? JSON.stringify(where, null, 2) : "{}";
		try {
			await navigator.clipboard.writeText(text);
		} catch {
			// clipboard unavailable in some environments — silently no-op
		}
	};

	const handleImport = (where: unknown) => {
		try {
			const next = fromWhereClause(where as never);
			updateRoot(next);
		} catch {
			// malformed JSON — ignore
		}
	};

	const isEmpty = root.children.length === 0;

	return (
		<div
			data-slot="filter-rule-builder"
			className={cn(
				"flex flex-col gap-3 rounded-lg border border-primary-100 bg-background p-3",
				className,
			)}
		>
			<div className="flex items-center justify-between gap-2">
				<span className="font-mono text-xs uppercase tracking-wide text-secondary-700">
					Metadata filter
				</span>
				<div className="flex items-center gap-1">
					<ImportFilterButton onImport={handleImport} />
					<Button type="button" size="xs" variant="ghost" onClick={handleCopy}>
						<ClipboardCopy />
						Copy as where
					</Button>
					{onApply ? (
						<Button type="button" size="xs" variant="default" onClick={handleApply}>
							Apply
						</Button>
					) : null}
				</div>
			</div>

			{isEmpty ? (
				<EmptyTreeState
					onAddRule={() => updateRoot({ ...root, children: [createDefaultRule(fields)] })}
					hasFields={fields.length > 0}
				/>
			) : (
				<GroupNode group={root} fields={fields} depth={0} onChange={updateRoot} />
			)}
		</div>
	);
};

type EmptyTreeStateProps = {
	onAddRule: () => void;
	hasFields: boolean;
};

const EmptyTreeState: FC<EmptyTreeStateProps> = (props) => {
	const { onAddRule, hasFields } = props;
	return (
		<div className="flex flex-col items-start gap-2 rounded-md border border-dashed border-primary-200 px-3 py-4">
			<p className="text-sm text-secondary-700">No filters yet</p>
			<Button type="button" size="xs" variant="outline" onClick={onAddRule} disabled={!hasFields}>
				<Plus />
				Add filter
			</Button>
		</div>
	);
};

type GroupNodeProps = {
	group: Group;
	fields: FieldDefinition[];
	depth: number;
	onChange: (next: Group) => void;
	onRemove?: () => void;
};

const GroupNode: FC<GroupNodeProps> = (props) => {
	const { group, fields, depth, onChange, onRemove } = props;

	const handleOpToggle = (next: GroupOperator) => {
		onChange({ ...group, op: next });
	};

	const handleAddRule = () => {
		onChange({
			...group,
			children: [...group.children, createDefaultRule(fields)],
		});
	};

	const handleAddGroup = () => {
		onChange({
			...group,
			children: [...group.children, createEmptyGroup(group.op === "$and" ? "$or" : "$and")],
		});
	};

	const handleChildChange = (index: number, next: Rule | Group) => {
		const nextChildren = group.children.slice();
		nextChildren[index] = next;
		onChange({ ...group, children: nextChildren });
	};

	const handleChildRemove = (index: number) => {
		const nextChildren = group.children.filter((_, i) => i !== index);
		onChange({ ...group, children: nextChildren });
	};

	return (
		<div
			data-slot="filter-group"
			data-depth={depth}
			className={cn(
				"flex flex-col gap-2 rounded-md border border-primary-100 bg-secondary-50/40 p-2",
				depth > 0 && "border-l-2 border-l-primary-300",
			)}
		>
			<div className="flex items-center gap-2">
				<GroupOpToggle value={group.op} onChange={handleOpToggle} />
				<span className="text-xs text-secondary-700">
					{group.children.length} {group.children.length === 1 ? "rule" : "rules"}
				</span>
				<div className="ml-auto flex items-center gap-1">
					<Button type="button" size="xs" variant="ghost" onClick={handleAddRule}>
						<Plus />
						Filter
					</Button>
					<Button type="button" size="xs" variant="ghost" onClick={handleAddGroup}>
						<Plus />
						Group
					</Button>
					{onRemove ? (
						<Button
							type="button"
							size="icon-xs"
							variant="ghost"
							onClick={onRemove}
							aria-label="Remove group"
						>
							<Trash2 />
						</Button>
					) : null}
				</div>
			</div>
			<div className="flex flex-col gap-2 pl-2">
				{group.children.map((child, index) => {
					if (isGroup(child)) {
						return (
							<GroupNode
								key={child.id}
								group={child}
								fields={fields}
								depth={depth + 1}
								onChange={(next) => handleChildChange(index, next)}
								onRemove={() => handleChildRemove(index)}
							/>
						);
					}
					return (
						<RuleRow
							key={child.id}
							rule={child}
							fields={fields}
							onChange={(next) => handleChildChange(index, next)}
							onRemove={() => handleChildRemove(index)}
						/>
					);
				})}
			</div>
		</div>
	);
};

type GroupOpToggleProps = {
	value: GroupOperator;
	onChange: (next: GroupOperator) => void;
};

const GroupOpToggle: FC<GroupOpToggleProps> = (props) => {
	const { value, onChange } = props;
	const handleAnd = () => onChange("$and");
	const handleOr = () => onChange("$or");
	return (
		<fieldset
			aria-label="Group operator"
			className="inline-flex items-center overflow-hidden rounded-md border border-primary-200 p-0"
		>
			<button
				type="button"
				onClick={handleAnd}
				data-active={value === "$and"}
				className={cn(
					"px-2 py-0.5 font-mono text-xs uppercase",
					value === "$and"
						? "bg-primary-600 text-primary-foreground"
						: "bg-background text-secondary-700 hover:bg-secondary-100",
				)}
			>
				AND
			</button>
			<button
				type="button"
				onClick={handleOr}
				data-active={value === "$or"}
				className={cn(
					"px-2 py-0.5 font-mono text-xs uppercase",
					value === "$or"
						? "bg-primary-600 text-primary-foreground"
						: "bg-background text-secondary-700 hover:bg-secondary-100",
				)}
			>
				OR
			</button>
		</fieldset>
	);
};

type RuleRowProps = {
	rule: Rule;
	fields: FieldDefinition[];
	onChange: (next: Rule) => void;
	onRemove: () => void;
};

const RuleRow: FC<RuleRowProps> = (props) => {
	const { rule, fields, onChange, onRemove } = props;
	const field = fields.find((f) => f.name === rule.field);

	const handleFieldChange = (nextName: string) => {
		const nextField = fields.find((f) => f.name === nextName);
		if (!nextField) return;
		const allowed = operatorsForType(nextField.type);
		const nextOperator: Operator = allowed.includes(rule.operator) ? rule.operator : allowed[0];
		onChange({
			...rule,
			field: nextField.name,
			operator: nextOperator,
			value: defaultValueForField(nextField, nextOperator),
		});
	};

	const handleOperatorChange = (nextOperator: string) => {
		const op = nextOperator as Operator;
		if (!field) return;
		const wasList = rule.operator === "$in" || rule.operator === "$nin";
		const isList = op === "$in" || op === "$nin";
		const nextValue: RuleValue = wasList === isList ? rule.value : defaultValueForField(field, op);
		onChange({ ...rule, operator: op, value: nextValue });
	};

	const handleValueChange = (nextValue: RuleValue) => {
		onChange({ ...rule, value: nextValue });
	};

	return (
		<div
			data-slot="filter-rule"
			className="flex flex-wrap items-center gap-2 rounded-md border border-primary-100 bg-background px-2 py-1.5"
		>
			<Select value={rule.field} onValueChange={handleFieldChange}>
				<SelectTrigger size="sm" className="min-w-32">
					<SelectValue placeholder="Field" />
				</SelectTrigger>
				<SelectContent>
					{fields.map((f) => (
						<SelectItem key={f.name} value={f.name}>
							{f.label ?? f.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{field ? (
				<Select value={rule.operator} onValueChange={handleOperatorChange}>
					<SelectTrigger size="sm" className="min-w-32">
						<SelectValue placeholder="Operator" />
					</SelectTrigger>
					<SelectContent>
						{operatorsForType(field.type).map((op) => (
							<SelectItem key={op} value={op}>
								{OPERATOR_LABELS[op]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			) : null}

			{field ? (
				<RuleValueInput
					field={field}
					operator={rule.operator}
					value={rule.value}
					onChange={handleValueChange}
				/>
			) : null}

			<Button
				type="button"
				size="icon-xs"
				variant="ghost"
				onClick={onRemove}
				aria-label="Remove rule"
				className="ml-auto"
			>
				<X />
			</Button>
		</div>
	);
};

type RuleValueInputProps = {
	field: FieldDefinition;
	operator: Operator;
	value: RuleValue;
	onChange: (next: RuleValue) => void;
};

const RuleValueInput: FC<RuleValueInputProps> = (props) => {
	const { field, operator, value, onChange } = props;
	const isListOp = operator === "$in" || operator === "$nin";

	if (isListOp) {
		return (
			<TagInput
				field={field}
				value={Array.isArray(value) ? (value as (string | number)[]) : []}
				onChange={onChange}
			/>
		);
	}

	if (field.type === "boolean") {
		const boolValue = value === true ? "true" : "false";
		const handleChange = (next: string) => onChange(next === "true");
		return (
			<Select value={boolValue} onValueChange={handleChange}>
				<SelectTrigger size="sm" className="min-w-24">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="true">true</SelectItem>
					<SelectItem value="false">false</SelectItem>
				</SelectContent>
			</Select>
		);
	}

	if (field.enumValues && field.enumValues.length > 0) {
		const handleChange = (next: string) => onChange(next);
		return (
			<Select value={typeof value === "string" ? value : ""} onValueChange={handleChange}>
				<SelectTrigger size="sm" className="min-w-32">
					<SelectValue placeholder="Value" />
				</SelectTrigger>
				<SelectContent>
					{field.enumValues.map((v) => (
						<SelectItem key={v} value={v}>
							{v}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		);
	}

	if (field.type === "number") {
		const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			const num = e.target.value === "" ? 0 : Number(e.target.value);
			onChange(Number.isNaN(num) ? 0 : num);
		};
		return (
			<Input
				type="number"
				value={typeof value === "number" ? value : 0}
				onChange={handleChange}
				className="h-8 w-32"
			/>
		);
	}

	if (field.type === "date") {
		const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value);
		return (
			<Input
				type="date"
				value={typeof value === "string" ? value : ""}
				onChange={handleChange}
				className="h-8 w-40"
			/>
		);
	}

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value);
	return (
		<Input
			type="text"
			value={typeof value === "string" ? value : ""}
			onChange={handleChange}
			className="h-8 w-40"
			placeholder="value"
		/>
	);
};

type TagInputProps = {
	field: FieldDefinition;
	value: (string | number)[];
	onChange: (next: RuleValue) => void;
};

const TagInput: FC<TagInputProps> = (props) => {
	const { field, value, onChange } = props;
	const [draft, setDraft] = useState("");

	const isNumberField = field.type === "number" || field.type === "date";

	const commit = () => {
		const trimmed = draft.trim();
		if (!trimmed) return;
		if (field.type === "number") {
			const num = Number(trimmed);
			if (Number.isNaN(num)) return;
			onChange([...(value as number[]), num]);
		} else {
			onChange([...(value as string[]), trimmed]);
		}
		setDraft("");
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" || e.key === ",") {
			e.preventDefault();
			commit();
		}
		if (e.key === "Backspace" && draft === "" && value.length > 0) {
			onChange(value.slice(0, -1) as RuleValue);
		}
	};

	const handleDraftChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setDraft(e.target.value);
	};

	const handleRemove = (index: number) => {
		onChange(value.filter((_, i) => i !== index) as RuleValue);
	};

	return (
		<div className="flex min-w-48 flex-wrap items-center gap-1 rounded-md border border-input bg-background px-1.5 py-1">
			{value.map((v, i) => (
				<span
					key={`${String(v)}-${i}`}
					className="inline-flex items-center gap-1 rounded-sm bg-secondary-100 px-1.5 py-0.5 font-mono text-xs text-primary-900"
				>
					{String(v)}
					<button
						type="button"
						aria-label={`Remove ${String(v)}`}
						onClick={() => handleRemove(i)}
						className="text-secondary-600 hover:text-primary-900"
					>
						<X className="size-3" />
					</button>
				</span>
			))}
			<input
				type={isNumberField ? "text" : "text"}
				value={draft}
				onChange={handleDraftChange}
				onKeyDown={handleKeyDown}
				onBlur={commit}
				placeholder={value.length === 0 ? "add value, Enter" : ""}
				className="h-6 min-w-20 flex-1 bg-transparent text-sm outline-none"
			/>
		</div>
	);
};

type ImportFilterButtonProps = {
	onImport: (where: unknown) => void;
};

const ImportFilterButton: FC<ImportFilterButtonProps> = (props) => {
	const { onImport } = props;
	const [draft, setDraft] = useState("");
	const [error, setError] = useState<string | undefined>(undefined);
	const [open, setOpen] = useState(false);

	const handleDraftChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setDraft(e.target.value);
		setError(undefined);
	};

	const handleApply = () => {
		try {
			const parsed = JSON.parse(draft);
			onImport(parsed);
			setOpen(false);
			setDraft("");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Invalid JSON");
		}
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button type="button" size="xs" variant="ghost">
					<Download />
					Import
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-96">
				<div className="flex flex-col gap-2">
					<p className="text-sm font-medium text-primary-900">Paste a chromadb where clause</p>
					<textarea
						value={draft}
						onChange={handleDraftChange}
						rows={8}
						spellCheck={false}
						className="w-full rounded-md border border-input bg-background p-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
						placeholder='{"$and": [{"wingId": {"$eq": "convos"}}]}'
					/>
					{error ? <p className="text-xs text-destructive">{error}</p> : null}
					<div className="flex justify-end">
						<Button type="button" size="xs" variant="default" onClick={handleApply}>
							Replace tree
						</Button>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
};
