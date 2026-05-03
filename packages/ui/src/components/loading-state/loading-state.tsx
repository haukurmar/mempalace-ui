import { cn } from "../../lib/utils";
import { Loader2 } from "lucide-react";
import type { FC } from "react";

export type LoadingStateProps = {
	label?: string;
	description?: string;
	className?: string;
};

export const LoadingState: FC<LoadingStateProps> = (props) => {
	const { label = "Loading…", description, className } = props;

	return (
		<div
			role="status"
			aria-live="polite"
			className={cn(
				"flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
				className,
			)}
		>
			<Loader2 className="size-6 animate-spin text-primary-500" aria-hidden="true" />
			<div className="flex flex-col gap-1">
				<p className="text-base font-medium text-primary-900">{label}</p>
				{description ? <p className="max-w-sm text-sm text-secondary-700">{description}</p> : null}
			</div>
		</div>
	);
};
