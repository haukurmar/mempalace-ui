import { ChevronRight } from "lucide-react";
import {
	type FC,
	type FocusEvent,
	type KeyboardEvent,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { KeybindRegistryContext, useKeybind, useScope } from "../../keyboard";
import { cn } from "../../lib/utils";

export type RoomNode = {
	id: string;
	name: string;
	drawerCount: number;
};

export type WingNode = {
	id: string;
	name: string;
	color?: string;
	drawerCount: number;
	rooms: RoomNode[];
};

export type RoomTreeData = {
	wings: WingNode[];
};

export type RoomTreeProps = {
	data: RoomTreeData;
	selectedId?: string;
	expandedIds?: Set<string>;
	onSelect?: (id: string, kind: "wing" | "room") => void;
	onToggle?: (id: string) => void;
	density?: "comfortable" | "compact";
	className?: string;
};

type FlatNode =
	| { kind: "wing"; wing: WingNode; expanded: boolean }
	| { kind: "room"; wing: WingNode; room: RoomNode };

const formatCount = (n: number) => n.toLocaleString();

export const RoomTree: FC<RoomTreeProps> = (props) => {
	const {
		data,
		selectedId,
		expandedIds,
		onSelect,
		onToggle,
		density = "comfortable",
		className,
	} = props;

	const isControlled = expandedIds !== undefined;
	const [internalExpanded, setInternalExpanded] = useState<Set<string>>(() => new Set());
	const expanded = isControlled ? expandedIds : internalExpanded;

	const [focusedId, setFocusedId] = useState<string | undefined>(() => data.wings[0]?.id);
	const [isFocused, setIsFocused] = useState(false);
	const containerRef = useRef<HTMLDivElement | null>(null);

	// The keyboard registry's J/K/Enter grammar layers on top of the always-on
	// arrow-key roving navigation, but it requires a KeybindRegistryProvider in
	// the tree. Detect it so the component still renders (with arrows + native
	// click) when mounted outside a provider.
	const hasRegistry = useContext(KeybindRegistryContext) !== null;

	const flat = useMemo<FlatNode[]>(() => {
		const out: FlatNode[] = [];
		for (const wing of data.wings) {
			const isExpanded = expanded.has(wing.id);
			out.push({ kind: "wing", wing, expanded: isExpanded });
			if (isExpanded) {
				for (const room of wing.rooms) {
					out.push({ kind: "room", wing, room });
				}
			}
		}
		return out;
	}, [data.wings, expanded]);

	useEffect(() => {
		if (focusedId && flat.some((n) => nodeId(n) === focusedId)) return;
		setFocusedId(flat[0] ? nodeId(flat[0]) : undefined);
	}, [flat, focusedId]);

	const toggle = useCallback(
		(wingId: string) => {
			if (isControlled) {
				onToggle?.(wingId);
				return;
			}
			setInternalExpanded((prev) => {
				const next = new Set(prev);
				if (next.has(wingId)) next.delete(wingId);
				else next.add(wingId);
				return next;
			});
		},
		[isControlled, onToggle],
	);

	const focusNode = (id: string) => {
		setFocusedId(id);
		const el = containerRef.current?.querySelector<HTMLElement>(`[data-node-id="${id}"]`);
		el?.focus();
	};

	// Shared next/previous movement used by both the arrow keys (local handler)
	// and the J/K registry aliases, so they stay in lockstep.
	const moveFocus = (delta: number) => {
		if (flat.length === 0) return;
		if (!focusedId) {
			focusNode(nodeId(flat[0]));
			return;
		}
		const idx = flat.findIndex((n) => nodeId(n) === focusedId);
		if (idx === -1) return;
		const target = flat[idx + delta];
		if (target) focusNode(nodeId(target));
	};

	// Enter semantics: activate/open the focused node only. Expand/collapse stays
	// on the arrow keys (and Space), per the J/K/Enter grammar.
	const activateFocused = () => {
		if (!focusedId) return;
		const node = flat.find((n) => nodeId(n) === focusedId);
		if (!node) return;
		if (node.kind === "wing") onSelect?.(node.wing.id, "wing");
		else onSelect?.(node.room.id, "room");
	};

	const handleNext = () => {
		moveFocus(1);
	};

	const handlePrev = () => {
		moveFocus(-1);
	};

	const handleFocus = () => {
		setIsFocused(true);
	};

	const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
		if (!containerRef.current?.contains(event.relatedTarget as Node | null)) {
			setIsFocused(false);
		}
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (!focusedId) return;
		const idx = flat.findIndex((n) => nodeId(n) === focusedId);
		if (idx === -1) return;
		const current = flat[idx];

		switch (event.key) {
			case "ArrowDown": {
				event.preventDefault();
				moveFocus(1);
				break;
			}
			case "ArrowUp": {
				event.preventDefault();
				moveFocus(-1);
				break;
			}
			case "ArrowRight": {
				event.preventDefault();
				if (current.kind === "wing") {
					if (!current.expanded && current.wing.rooms.length > 0) {
						toggle(current.wing.id);
					} else if (current.expanded && current.wing.rooms[0]) {
						focusNode(current.wing.rooms[0].id);
					}
				}
				break;
			}
			case "ArrowLeft": {
				event.preventDefault();
				if (current.kind === "wing" && current.expanded) {
					toggle(current.wing.id);
				} else if (current.kind === "room") {
					focusNode(current.wing.id);
				}
				break;
			}
			case " ": {
				// Space toggles expansion on a wing; on a leaf room it activates.
				// Enter (activate/open) is owned by the registry's "tree" scope.
				event.preventDefault();
				if (current.kind === "wing") {
					if (current.wing.rooms.length > 0) toggle(current.wing.id);
				} else {
					onSelect?.(current.room.id, "room");
				}
				break;
			}
		}
	};

	if (data.wings.length === 0) {
		return (
			<div
				className={cn(
					"flex flex-col items-center justify-center rounded-md border border-dashed border-primary-200 px-4 py-8 text-center",
					className,
				)}
				role="status"
			>
				<p className="text-sm text-secondary-700">Palace has no wings yet</p>
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			role="tree"
			aria-label="Palace structure"
			data-density={density}
			onKeyDown={handleKeyDown}
			onFocus={handleFocus}
			onBlur={handleBlur}
			className={cn("flex flex-col gap-0.5 font-body text-small", className)}
		>
			{hasRegistry ? (
				<RoomTreeKeybinds
					active={isFocused}
					onNext={handleNext}
					onPrev={handlePrev}
					onActivate={activateFocused}
				/>
			) : null}
			{data.wings.map((wing) => {
				const isExpanded = expanded.has(wing.id);
				return (
					<WingRow
						key={wing.id}
						wing={wing}
						expanded={isExpanded}
						selectedId={selectedId}
						focusedId={focusedId}
						density={density}
						onToggle={toggle}
						onSelect={onSelect}
						onFocusNode={setFocusedId}
					/>
				);
			})}
		</div>
	);
};

const nodeId = (node: FlatNode) => (node.kind === "wing" ? node.wing.id : node.room.id);

type RoomTreeKeybindsProps = {
	active: boolean;
	onNext: () => void;
	onPrev: () => void;
	onActivate: () => void;
};

/**
 * Registers the tree's J/K/Enter grammar with the keyboard registry and pushes
 * the "tree" scope while the tree is focused. Rendered only when a
 * KeybindRegistryProvider is present (it relies on registry hooks); it draws
 * nothing. J aliases ArrowDown, K aliases ArrowUp, and Enter activates the
 * focused node. Esc is intentionally not bound here so it bubbles to the global
 * overlay-dismiss layer.
 */
const RoomTreeKeybinds: FC<RoomTreeKeybindsProps> = (props) => {
	const { active, onNext, onPrev, onActivate } = props;

	useScope("tree", active);

	useKeybind({
		id: "tree.next",
		keys: "j",
		label: "Next item",
		scope: "tree",
		group: "Navigation",
		handler: onNext,
	});
	useKeybind({
		id: "tree.prev",
		keys: "k",
		label: "Previous item",
		scope: "tree",
		group: "Navigation",
		handler: onPrev,
	});
	useKeybind({
		id: "tree.activate",
		keys: "Enter",
		label: "Open focused item",
		scope: "tree",
		group: "Navigation",
		handler: onActivate,
	});

	return null;
};

type WingRowProps = {
	wing: WingNode;
	expanded: boolean;
	selectedId?: string;
	focusedId?: string;
	density: "comfortable" | "compact";
	onToggle: (id: string) => void;
	onSelect?: (id: string, kind: "wing" | "room") => void;
	onFocusNode: (id: string) => void;
};

const WingRow: FC<WingRowProps> = (props) => {
	const { wing, expanded, selectedId, focusedId, density, onToggle, onSelect, onFocusNode } = props;

	const handleClick = () => {
		onSelect?.(wing.id, "wing");
		if (wing.rooms.length > 0) onToggle(wing.id);
	};

	const handleFocus = () => {
		onFocusNode(wing.id);
	};

	const isSelected = selectedId === wing.id;
	const isFocused = focusedId === wing.id;
	const dotStyle = wing.color ? { backgroundColor: wing.color } : undefined;

	return (
		<div>
			<button
				type="button"
				role="treeitem"
				aria-expanded={wing.rooms.length > 0 ? expanded : undefined}
				aria-selected={isSelected}
				data-node-id={wing.id}
				data-selected={isSelected}
				tabIndex={isFocused ? 0 : -1}
				onClick={handleClick}
				onFocus={handleFocus}
				className={cn(
					"group relative flex w-full items-center gap-1.5 rounded-md pr-2 text-left text-primary-900 transition-colors hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400",
					density === "compact" ? "h-7 pl-1" : "h-8 pl-1.5",
					isSelected && "bg-primary-100",
				)}
			>
				{isSelected ? (
					<span
						aria-hidden="true"
						className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary-600"
					/>
				) : null}
				<ChevronRight
					aria-hidden="true"
					className={cn(
						"size-3.5 shrink-0 text-secondary-500 transition-transform",
						expanded && "rotate-90",
						wing.rooms.length === 0 && "opacity-30",
					)}
				/>
				<span
					aria-hidden="true"
					className={cn(
						"inline-block size-2 shrink-0 rounded-full",
						wing.color ? "" : "bg-primary-500",
					)}
					style={dotStyle}
				/>
				<span className="truncate font-medium">{wing.name}</span>
				<span className="ml-auto shrink-0 font-mono text-xs tabular-nums text-secondary-600">
					{formatCount(wing.drawerCount)}
				</span>
			</button>
			{expanded ? (
				<div className="ml-3 border-l border-primary-100">
					{wing.rooms.map((room) => (
						<RoomRow
							key={room.id}
							wing={wing}
							room={room}
							selectedId={selectedId}
							focusedId={focusedId}
							density={density}
							onSelect={onSelect}
							onFocusNode={onFocusNode}
						/>
					))}
				</div>
			) : null}
		</div>
	);
};

type RoomRowProps = {
	wing: WingNode;
	room: RoomNode;
	selectedId?: string;
	focusedId?: string;
	density: "comfortable" | "compact";
	onSelect?: (id: string, kind: "wing" | "room") => void;
	onFocusNode: (id: string) => void;
};

const RoomRow: FC<RoomRowProps> = (props) => {
	const { room, selectedId, focusedId, density, onSelect, onFocusNode } = props;

	const handleClick = () => {
		onSelect?.(room.id, "room");
	};

	const handleFocus = () => {
		onFocusNode(room.id);
	};

	const isSelected = selectedId === room.id;
	const isFocused = focusedId === room.id;

	return (
		<button
			type="button"
			role="treeitem"
			aria-selected={isSelected}
			data-node-id={room.id}
			data-selected={isSelected}
			tabIndex={isFocused ? 0 : -1}
			onClick={handleClick}
			onFocus={handleFocus}
			className={cn(
				"group relative flex w-full items-center gap-2 rounded-md pr-2 pl-3 text-left text-primary-800 transition-colors hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400",
				density === "compact" ? "h-6" : "h-7",
				isSelected && "bg-primary-100 text-primary-900",
			)}
		>
			{isSelected ? (
				<span
					aria-hidden="true"
					className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary-600"
				/>
			) : null}
			<span className="truncate">{room.name}</span>
			<span className="ml-auto shrink-0 font-mono text-xs tabular-nums text-secondary-600">
				{formatCount(room.drawerCount)}
			</span>
		</button>
	);
};
