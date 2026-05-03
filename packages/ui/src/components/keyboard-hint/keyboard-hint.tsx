import { cn } from "../../lib/utils";
import { Fragment, type FC } from "react";

export type KeyboardHintProps = {
	keys: string[] | string;
	className?: string;
};

const KEY_GLYPHS: Record<string, string> = {
	cmd: "⌘",
	command: "⌘",
	meta: "⌘",
	shift: "⇧",
	alt: "⌥",
	option: "⌥",
	opt: "⌥",
	ctrl: "⌃",
	control: "⌃",
	enter: "↵",
	return: "↵",
	esc: "Esc",
	escape: "Esc",
	tab: "Tab",
	space: "Space",
	backspace: "⌫",
	delete: "⌦",
	up: "↑",
	down: "↓",
	left: "←",
	right: "→",
	arrowup: "↑",
	arrowdown: "↓",
	arrowleft: "←",
	arrowright: "→",
};

const renderKey = (raw: string): string => {
	const normalized = raw.toLowerCase();
	const glyph = KEY_GLYPHS[normalized];
	if (glyph) return glyph;
	if (raw.length === 1) return raw.toUpperCase();
	return raw;
};

export const KeyboardHint: FC<KeyboardHintProps> = (props) => {
	const { keys, className } = props;
	const keyList = Array.isArray(keys) ? keys : keys.split("+").map((k) => k.trim());

	return (
		<span
			className={cn("inline-flex items-center gap-1 align-middle", className)}
			title={keyList.join("+")}
		>
			{keyList.map((key, index) => (
				<Fragment key={`${key}-${index}`}>
					{index > 0 ? (
						<span aria-hidden="true" className="text-xs text-secondary-700">
							+
						</span>
					) : null}
					<kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-secondary-300 bg-secondary-50 px-1 font-mono text-xs font-medium text-primary-800 shadow-xs">
						{renderKey(key)}
					</kbd>
				</Fragment>
			))}
		</span>
	);
};
