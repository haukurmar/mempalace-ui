import type { CSSProperties, FC, ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../primitives";
import { KeyboardHint } from "../keyboard-hint";

export type RailItemData = {
	id: string;
	/** A ReactNode (the consumer passes a lucide icon, e.g. `<Home />`). */
	icon: ReactNode;
	label: string;
	keyHint?: string[];
	/** Alternative to driving selection via `AppRail`'s `activeId`. */
	active?: boolean;
};

export type RailItemRenderArgs = {
	item: RailItemData;
	isActive: boolean;
	expanded: boolean;
	/** Apply this to the interactive element you return (a router `Link`, `button`, …). */
	className: string;
	/** The rail-styled inner content (left accent, icon, label, key hint). */
	children: ReactNode;
};

/**
 * Render-prop the consumer supplies to own the interactive element — this is the
 * seam that keeps the rail router-agnostic. The rail computes the styling and
 * inner content; the consumer wraps them in `<Link to=…>` (or anything else).
 */
export type RailItemRenderer = (args: RailItemRenderArgs) => ReactNode;

type RailDensity = "comfortable" | "compact";

type RailItemProps = {
	item: RailItemData;
	isActive: boolean;
	expanded: boolean;
	density: RailDensity;
	onSelect?: (id: string) => void;
	renderItem?: RailItemRenderer;
};

// The lit/active treatments lean on token color vars (no raw hex) for the glow.
const litIconStyle: CSSProperties = {
	filter: "drop-shadow(0 0 6px color-mix(in oklab, var(--color-primary-400) 70%, transparent))",
};

const accentStyle: CSSProperties = {
	boxShadow: "0 0 8px color-mix(in oklab, var(--color-primary-400) 55%, transparent)",
	transitionProperty: "opacity, transform",
	transitionDuration: "var(--motion-feedback-duration)",
	transitionTimingFunction: "var(--motion-feedback-ease)",
};

export const RailItem: FC<RailItemProps> = (props) => {
	const { item, isActive, expanded, density, onSelect, renderItem } = props;

	const handleSelect = () => {
		onSelect?.(item.id);
	};

	const rowClassName = cn(
		"group/rail-item relative flex w-full items-center text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500/60",
		density === "compact" ? "h-10" : "h-12",
		expanded ? "justify-start gap-3 px-4" : "justify-center px-0",
		isActive
			? "bg-primary-400/10 text-primary-100"
			: "text-secondary-300/60 hover:bg-primary-400/5 hover:text-secondary-100",
	);

	const children = (
		<>
			{isActive ? (
				<span
					aria-hidden="true"
					className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-primary-400"
					style={accentStyle}
				/>
			) : null}
			<span
				aria-hidden="true"
				className="flex size-5 shrink-0 items-center justify-center [&_svg]:size-5"
				style={isActive ? litIconStyle : undefined}
			>
				{item.icon}
			</span>
			{expanded ? (
				<span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
					<span className="truncate text-sm font-medium">{item.label}</span>
					{item.keyHint ? (
						<KeyboardHint keys={item.keyHint} className="ml-auto opacity-80" />
					) : null}
				</span>
			) : null}
		</>
	);

	const element = renderItem ? (
		renderItem({ item, isActive, expanded, className: rowClassName, children })
	) : (
		<button
			type="button"
			onClick={handleSelect}
			aria-current={isActive ? "page" : undefined}
			aria-label={!expanded ? item.label : undefined}
			className={rowClassName}
		>
			{children}
		</button>
	);

	// Labels live in the tooltip only while collapsed; once expanded the inline
	// label carries them.
	if (expanded) return <>{element}</>;

	return (
		<Tooltip>
			<TooltipTrigger asChild>{element}</TooltipTrigger>
			<TooltipContent side="right" className="flex items-center gap-2">
				<span>{item.label}</span>
				{item.keyHint ? <KeyboardHint keys={item.keyHint} /> : null}
			</TooltipContent>
		</Tooltip>
	);
};
