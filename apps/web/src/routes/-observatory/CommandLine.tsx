import { type CSSProperties, type FC, useCallback } from "react";

export type CommandLineProps = {
	onOpen: () => void;
};

const rootStyle: CSSProperties = { animationDelay: "760ms" };

/**
 * The portal's single CTA: a thin, underlined prompt that reads like a command
 * line waiting for input. Clicking (or the global ⌘K) opens the command palette.
 * Deliberately understated — one focal affordance amid the negative space.
 */
export const CommandLine: FC<CommandLineProps> = (props) => {
	const { onOpen } = props;

	const handleClick = useCallback(() => {
		onOpen();
	}, [onOpen]);

	return (
		<button
			type="button"
			onClick={handleClick}
			style={rootStyle}
			className="observatory-rise group pointer-events-auto flex items-center gap-3 border-b border-secondary-400/25 px-2 pb-2.5 transition-colors duration-300 hover:border-primary-300/60 focus:outline-none focus-visible:border-primary-300"
		>
			<kbd className="rounded-[5px] border border-secondary-400/30 bg-primary-950/40 px-1.5 py-0.5 font-mono text-[11px] tracking-widest text-secondary-200/80 transition-colors group-hover:border-primary-300/50 group-hover:text-primary-200">
				⌘K
			</kbd>
			<span className="font-serif text-lg text-secondary-200/70 transition-colors duration-300 group-hover:text-secondary-50">
				search your mind
			</span>
			<span
				aria-hidden
				className="ml-2 h-4 w-px animate-pulse bg-primary-300/70 transition-colors group-hover:bg-primary-200"
			/>
		</button>
	);
};
