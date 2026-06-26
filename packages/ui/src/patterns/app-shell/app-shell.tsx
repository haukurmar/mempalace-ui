import type { FC, ReactNode } from "react";
import { cn } from "../../lib/utils";

export type AppShellProps = {
	/** The persistent left chrome — typically an `AppRail`. It sets its own width. */
	rail: ReactNode;
	/** The page `main`. Owns its own scroll and internal layout. */
	children: ReactNode;
	className?: string;
};

/**
 * The everyday app frame: a fixed-width rail column beside a flexible `main` that
 * fills the rest, full height. Intentionally minimal — it only establishes the
 * frame; the page content inside `main` owns its own scrolling and layout.
 */
export const AppShell: FC<AppShellProps> = (props) => {
	const { rail, children, className } = props;

	return (
		<div className={cn("flex h-full min-h-0 w-full bg-background", className)}>
			{rail}
			<main className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</main>
		</div>
	);
};
