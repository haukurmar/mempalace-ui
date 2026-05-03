import { cn } from "../../lib/utils";
import { AlertTriangle } from "lucide-react";
import type { FC, ReactNode } from "react";

export type ErrorStateProps = {
	title?: string;
	description?: string;
	icon?: ReactNode;
	action?: ReactNode;
	className?: string;
};

export const ErrorState: FC<ErrorStateProps> = (props) => {
	const { title = "Something went wrong", description, icon, action, className } = props;
	const renderedIcon = icon ?? <AlertTriangle className="size-6" aria-hidden="true" />;

	return (
		<div
			role="alert"
			className={cn(
				"flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
				className,
			)}
		>
			<div className="flex size-12 items-center justify-center rounded-full bg-red-100 text-red-700">
				{renderedIcon}
			</div>
			<div className="flex flex-col gap-1">
				<p className="text-base font-medium text-primary-900">{title}</p>
				{description ? <p className="max-w-sm text-sm text-secondary-700">{description}</p> : null}
			</div>
			{action ? <div className="mt-2">{action}</div> : null}
		</div>
	);
};
