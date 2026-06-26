import { type FC, type ReactNode, useRef } from "react";
import { useKeybind, useScope } from "../../keyboard";
import { cn } from "../../lib/utils";
import { Sheet, SheetContent, SheetTitle } from "../../primitives";

export type ListDetailLayoutProps = {
	sidebar: ReactNode;
	main: ReactNode;
	detail?: ReactNode;
	detailOpen?: boolean;
	onDetailClose?: () => void;
	header?: ReactNode;
	sidebarWidth?: string;
	className?: string;
};

export const ListDetailLayout: FC<ListDetailLayoutProps> = (props) => {
	const {
		sidebar,
		main,
		detail,
		detailOpen = false,
		onDetailClose,
		header,
		sidebarWidth = "w-72",
		className,
	} = props;

	// Make the drawer-panel scope topmost while the slide-over is open so its Esc
	// binding shadows lower scopes — this is what gives the registry's
	// "Esc closes the topmost overlay" grammar the correct winner.
	useScope("drawer-panel", detailOpen);

	const handleClose = () => {
		onDetailClose?.();
	};

	useKeybind({
		id: "list-detail-layout:close-detail",
		keys: "Esc",
		label: "Close detail panel",
		scope: "drawer-panel",
		group: "Detail panel",
		handler: handleClose,
	});

	// Radix restores focus to the element focused when the panel mounted, which
	// works even for programmatic (keyboard-list) opens with no DOM trigger. We
	// also snapshot that element ourselves as a guaranteed restoration target.
	// The snapshot must be taken during render of THIS component: Radix's focus
	// trap moves focus in a child layout effect that runs before any effect here,
	// so by the time an effect in this component fires the original element is
	// already blurred.
	const restoreFocusRef = useRef<HTMLElement | null>(null);
	const wasOpenRef = useRef(detailOpen);
	if (detailOpen && !wasOpenRef.current) {
		restoreFocusRef.current =
			typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null);
	}
	wasOpenRef.current = detailOpen;

	const handleOpenChange = (open: boolean) => {
		if (!open) onDetailClose?.();
	};

	// Esc is owned by the keybind registry (drawer-panel scope), so neutralize
	// Radix's built-in Esc-to-close to avoid a double close.
	const handleEscapeKeyDown = (event: KeyboardEvent) => {
		event.preventDefault();
	};

	const handleCloseAutoFocus = (event: Event) => {
		const target = restoreFocusRef.current;
		if (target && typeof document !== "undefined" && document.contains(target)) {
			event.preventDefault();
			target.focus();
		}
		restoreFocusRef.current = null;
	};

	return (
		<div className={cn("flex h-full w-full flex-col bg-background", className)}>
			{header ? (
				<div className="flex h-14 shrink-0 items-center border-b border-secondary-200 px-4">
					{header}
				</div>
			) : null}
			<div className="flex min-h-0 flex-1">
				<aside
					className={cn("shrink-0 overflow-y-auto border-r border-secondary-200", sidebarWidth)}
				>
					{sidebar}
				</aside>
				<div className="min-w-0 flex-1 overflow-y-auto">{main}</div>
			</div>
			<Sheet open={detailOpen} onOpenChange={handleOpenChange}>
				<SheetContent
					side="right"
					aria-describedby={undefined}
					onEscapeKeyDown={handleEscapeKeyDown}
					onCloseAutoFocus={handleCloseAutoFocus}
					className="w-full gap-0 overflow-y-auto border-secondary-200 p-0 sm:max-w-lg"
				>
					<SheetTitle className="sr-only">Detail panel</SheetTitle>
					{detail}
				</SheetContent>
			</Sheet>
		</div>
	);
};
