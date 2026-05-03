import { type FC, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "../../primitives/command";
import { cn } from "../../lib/utils";
import { KeyboardHint } from "../keyboard-hint";

export type CommandAction = {
	id: string;
	label: string;
	description?: string;
	keywords?: readonly string[];
	shortcut?: readonly string[];
	icon?: ReactNode;
	group?: string;
	run: () => void | Promise<void>;
};

export type CommandBarProps = {
	actions: CommandAction[];
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	placeholder?: string;
	recents?: ReadonlyArray<string>;
	onRecent?: (actionId: string) => void;
	className?: string;
};

const DEFAULT_GROUP = "Actions";
const RECENT_GROUP = "Recent";

const groupActions = (actions: CommandAction[]): Map<string, CommandAction[]> => {
	const groups = new Map<string, CommandAction[]>();
	for (const action of actions) {
		const key = action.group ?? DEFAULT_GROUP;
		const list = groups.get(key);
		if (list) {
			list.push(action);
		} else {
			groups.set(key, [action]);
		}
	}
	return groups;
};

export const CommandBar: FC<CommandBarProps> = (props) => {
	const {
		actions,
		open: controlledOpen,
		onOpenChange,
		placeholder = "Type a command or search…",
		recents,
		onRecent,
		className,
	} = props;

	const isControlled = controlledOpen !== undefined;
	const [internalOpen, setInternalOpen] = useState(false);
	const [query, setQuery] = useState("");
	const open = isControlled ? controlledOpen : internalOpen;

	const setOpen = useCallback(
		(next: boolean) => {
			if (!isControlled) {
				setInternalOpen(next);
			}
			onOpenChange?.(next);
		},
		[isControlled, onOpenChange],
	);

	useEffect(() => {
		if (isControlled) return;
		const handleKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				setInternalOpen((prev) => !prev);
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isControlled]);

	useEffect(() => {
		if (!open) setQuery("");
	}, [open]);

	const actionsById = useMemo(() => {
		const map = new Map<string, CommandAction>();
		for (const action of actions) map.set(action.id, action);
		return map;
	}, [actions]);

	const recentActions = useMemo(() => {
		if (!recents || recents.length === 0) return [];
		const seen = new Set<string>();
		const result: CommandAction[] = [];
		for (const id of recents) {
			if (seen.has(id)) continue;
			const action = actionsById.get(id);
			if (action) {
				result.push(action);
				seen.add(id);
			}
		}
		return result;
	}, [recents, actionsById]);

	const showRecents = recentActions.length > 0 && query.length === 0;
	const recentIds = useMemo(() => new Set(recentActions.map((a) => a.id)), [recentActions]);

	const visibleActions = useMemo(
		() => (showRecents ? actions.filter((a) => !recentIds.has(a.id)) : actions),
		[actions, showRecents, recentIds],
	);

	const grouped = useMemo(() => groupActions(visibleActions), [visibleActions]);

	const runAction = useCallback(
		async (action: CommandAction) => {
			await action.run();
			onRecent?.(action.id);
			setOpen(false);
		},
		[onRecent, setOpen],
	);

	return (
		<CommandDialog open={open} onOpenChange={setOpen} className={className}>
			<CommandInput placeholder={placeholder} value={query} onValueChange={setQuery} />
			<CommandList>
				<CommandEmpty>No results found.</CommandEmpty>
				{showRecents ? (
					<CommandGroup heading={RECENT_GROUP}>
						{recentActions.map((action) => (
							<CommandActionItem key={action.id} action={action} onRun={runAction} />
						))}
					</CommandGroup>
				) : null}
				{Array.from(grouped.entries()).map(([groupName, items]) => (
					<CommandGroup key={groupName} heading={groupName}>
						{items.map((action) => (
							<CommandActionItem key={action.id} action={action} onRun={runAction} />
						))}
					</CommandGroup>
				))}
			</CommandList>
		</CommandDialog>
	);
};

type CommandActionItemProps = {
	action: CommandAction;
	onRun: (action: CommandAction) => void;
};

const CommandActionItem: FC<CommandActionItemProps> = (props) => {
	const { action, onRun } = props;

	const handleSelect = () => {
		onRun(action);
	};

	const value = [action.label, action.description ?? "", ...(action.keywords ?? [])]
		.filter(Boolean)
		.join(" ");

	return (
		<CommandItem value={value} onSelect={handleSelect}>
			{action.icon ? (
				<span className="flex size-4 shrink-0 items-center">{action.icon}</span>
			) : null}
			<div className="flex min-w-0 flex-1 flex-col">
				<span className="truncate text-sm text-primary-900">{action.label}</span>
				{action.description ? (
					<span className={cn("truncate text-xs text-secondary-700")}>{action.description}</span>
				) : null}
			</div>
			{action.shortcut && action.shortcut.length > 0 ? (
				<KeyboardHint keys={[...action.shortcut]} className="ml-auto" />
			) : null}
		</CommandItem>
	);
};
