import type { FC, ReactNode } from "react";
import { cn } from "../../lib/utils";

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

	const handleOverlayClick = () => {
		onDetailClose?.();
	};

	return (
		<div className={cn("flex h-full w-full flex-col bg-background", className)}>
			{header ? (
				<div className="flex h-14 shrink-0 items-center border-b border-secondary-200 px-4">
					{header}
				</div>
			) : null}
			<div className="relative flex min-h-0 flex-1">
				<aside
					className={cn("shrink-0 overflow-y-auto border-r border-secondary-200", sidebarWidth)}
				>
					{sidebar}
				</aside>
				<main className="min-w-0 flex-1 overflow-y-auto">{main}</main>
				{detailOpen ? (
					<button
						type="button"
						aria-label="Close detail panel"
						onClick={handleOverlayClick}
						className="absolute inset-0 z-10 cursor-default bg-black/20 lg:hidden"
					/>
				) : null}
				<aside
					data-state={detailOpen ? "open" : "closed"}
					aria-hidden={!detailOpen}
					className={cn(
						"absolute inset-y-0 right-0 z-20 flex w-full max-w-[480px] flex-col overflow-y-auto border-l border-secondary-200 bg-background shadow-lg transition-transform duration-300 ease-in-out lg:w-[45%]",
						detailOpen ? "translate-x-0" : "translate-x-full",
					)}
				>
					{detail}
				</aside>
			</div>
		</div>
	);
};
