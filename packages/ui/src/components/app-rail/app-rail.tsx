import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { CSSProperties, FC, ReactNode } from "react";
import { useReducedMotion } from "../../lib/useReducedMotion";
import { cn } from "../../lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../primitives";
import { KeyboardHint } from "../keyboard-hint";
import { RailItem, type RailItemData, type RailItemRenderer } from "./rail-item";

type RailDensity = "comfortable" | "compact";

export type AppRailProps = {
	items: RailItemData[];
	/** The active item, derived by the consumer from its router location. */
	activeId?: string;
	/** Default selection handler — called when an item is clicked (when no
	 *  `renderItem` is supplied). The consumer performs the actual navigation. */
	onSelect?: (id: string) => void;
	/** Render-prop letting the consumer own each item's element (a router `Link`,
	 *  etc.) while the rail keeps ownership of the styling. */
	renderItem?: RailItemRenderer;
	density?: RailDensity;
	/** Controls the expanded (labels-visible) state. Expansion is driven solely by
	 *  this prop now (no hover/focus auto-expand). Defaults to `true` — open. */
	expanded?: boolean;
	/** Toggles `expanded`. When supplied, a collapse/expand button is rendered at
	 *  the top-left of the rail. The consumer owns (and persists) the state. */
	onToggleExpanded?: () => void;
	/** Brand / logo slot rendered next to the toggle button (only while expanded). */
	header?: ReactNode;
	/** Replaces the built-in ⌘K affordance in the footer. */
	footer?: ReactNode;
	/** Wires the footer ⌘K affordance to open the command palette. */
	onCommandPalette?: () => void;
	commandHint?: string[];
	commandLabel?: string;
	className?: string;
	"aria-label"?: string;
};

const DEFAULT_COMMAND_HINT = ["cmd", "k"];

// Width rides the `expand` motion tokens between the expanded and collapsed
// states. Values map to standard Tailwind widths (no arbitrary values):
//   expanded  → w-60 (240px): fits icons + labels + the ⌘K chips comfortably.
//   collapsed → w-20 (80px, comfortable) / w-16 (64px, compact): still wide
//               enough for the full ⌘ + K chips without crowding.
const WIDTH_EXPANDED = "w-60";
const WIDTH_COLLAPSED_COMFORTABLE = "w-20";
const WIDTH_COLLAPSED_COMPACT = "w-16";

const widthTransitionStyle: CSSProperties = {
	transitionProperty: "width",
	transitionDuration: "var(--motion-expand-duration)",
	transitionTimingFunction: "var(--motion-expand-ease)",
};

export const AppRail: FC<AppRailProps> = (props) => {
	const {
		items,
		activeId,
		onSelect,
		renderItem,
		density = "comfortable",
		expanded: expandedProp,
		onToggleExpanded,
		header,
		footer,
		onCommandPalette,
		commandHint = DEFAULT_COMMAND_HINT,
		commandLabel = "Command",
		className,
		"aria-label": ariaLabel = "Primary",
	} = props;

	const reduced = useReducedMotion();

	// Expansion is fully controlled now — default open when the prop is omitted.
	const expanded = expandedProp ?? true;

	const widthClass = expanded
		? WIDTH_EXPANDED
		: density === "compact"
			? WIDTH_COLLAPSED_COMPACT
			: WIDTH_COLLAPSED_COMFORTABLE;

	const slotHeight = density === "compact" ? "h-10" : "h-12";

	const showHeader = Boolean(onToggleExpanded) || Boolean(header);

	const footerContent =
		footer ??
		(onCommandPalette ? (
			<RailCommandButton
				expanded={expanded}
				heightClass={slotHeight}
				label={commandLabel}
				hint={commandHint}
				onActivate={onCommandPalette}
			/>
		) : null);

	return (
		<TooltipProvider delayDuration={300}>
			<aside
				data-density={density}
				data-expanded={expanded}
				style={reduced ? undefined : widthTransitionStyle}
				className={cn(
					"relative flex h-full shrink-0 flex-col overflow-hidden border-r border-primary-900/70 bg-primary-1000 text-secondary-100",
					widthClass,
					className,
				)}
			>
				{showHeader ? (
					<div
						className={cn(
							"flex shrink-0 items-center gap-2 border-b border-primary-900/70",
							slotHeight,
							expanded ? "px-2" : "justify-center px-0",
						)}
					>
						{onToggleExpanded ? (
							<RailToggleButton expanded={expanded} onToggle={onToggleExpanded} />
						) : null}
						{expanded && header ? <div className="min-w-0 flex-1">{header}</div> : null}
					</div>
				) : null}
				<nav aria-label={ariaLabel} className="flex flex-col gap-0.5 py-2">
					{items.map((item) => {
						const isActive = activeId === item.id || Boolean(item.active);
						return (
							<RailItem
								key={item.id}
								item={item}
								isActive={isActive}
								expanded={expanded}
								density={density}
								onSelect={onSelect}
								renderItem={renderItem}
							/>
						);
					})}
				</nav>
				{footerContent ? (
					<div className="mt-auto border-t border-primary-900/70 py-2">{footerContent}</div>
				) : null}
			</aside>
		</TooltipProvider>
	);
};

type RailToggleButtonProps = {
	expanded: boolean;
	onToggle: () => void;
};

const RailToggleButton: FC<RailToggleButtonProps> = (props) => {
	const { expanded, onToggle } = props;

	const handleClick = () => {
		onToggle();
	};

	const label = expanded ? "Collapse sidebar" : "Expand sidebar";

	const button = (
		<button
			type="button"
			onClick={handleClick}
			aria-label={label}
			aria-expanded={expanded}
			className="flex size-9 shrink-0 items-center justify-center rounded-md text-secondary-300/70 outline-none transition-colors hover:bg-primary-400/5 hover:text-secondary-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500/60 [&_svg]:size-5"
		>
			{expanded ? <PanelLeftClose /> : <PanelLeftOpen />}
		</button>
	);

	if (expanded) return button;

	return (
		<Tooltip>
			<TooltipTrigger asChild>{button}</TooltipTrigger>
			<TooltipContent side="right">{label}</TooltipContent>
		</Tooltip>
	);
};

type RailCommandButtonProps = {
	expanded: boolean;
	heightClass: string;
	label: string;
	hint: string[];
	onActivate: () => void;
};

const RailCommandButton: FC<RailCommandButtonProps> = (props) => {
	const { expanded, heightClass, label, hint, onActivate } = props;

	const handleClick = () => {
		onActivate();
	};

	const baseClassName =
		"group/rail-cmd flex w-full items-center text-left text-secondary-300/70 outline-none transition-colors hover:bg-primary-400/5 hover:text-secondary-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500/60";

	if (expanded) {
		return (
			<button
				type="button"
				onClick={handleClick}
				className={cn(baseClassName, heightClass, "justify-start px-4")}
			>
				<span className="truncate text-sm font-medium">{label}</span>
				<KeyboardHint keys={hint} className="ml-auto" />
			</button>
		);
	}

	// Collapsed: the full ⌘ + K chips stay visible, centered in the sliver — the
	// rail's collapsed width is sized to fit them without crowding.
	const button = (
		<button
			type="button"
			onClick={handleClick}
			aria-label={label}
			className={cn(baseClassName, heightClass, "justify-center px-0")}
		>
			<KeyboardHint keys={hint} />
		</button>
	);

	return (
		<Tooltip>
			<TooltipTrigger asChild>{button}</TooltipTrigger>
			<TooltipContent side="right" className="flex items-center gap-2">
				<span>{label}</span>
				<KeyboardHint keys={hint} />
			</TooltipContent>
		</Tooltip>
	);
};
