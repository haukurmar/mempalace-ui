import type { FC, ReactNode } from "react";
import { cn } from "../../lib/utils";

export type SettingsLayoutProps = {
	nav: ReactNode;
	pane: ReactNode;
	header?: ReactNode;
	navWidth?: string;
	className?: string;
};

export const SettingsLayout: FC<SettingsLayoutProps> = (props) => {
	const { nav, pane, header, navWidth = "w-56", className } = props;

	return (
		<div className={cn("flex h-full w-full flex-col bg-background", className)}>
			{header ? (
				<div className="flex h-14 shrink-0 items-center border-b border-secondary-200 px-4">
					{header}
				</div>
			) : null}
			<div className="flex min-h-0 flex-1">
				<aside className={cn("shrink-0 overflow-y-auto border-r border-secondary-200", navWidth)}>
					{nav}
				</aside>
				<div className="min-w-0 flex-1 overflow-y-auto">{pane}</div>
			</div>
		</div>
	);
};
