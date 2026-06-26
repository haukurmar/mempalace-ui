import type { FC } from "react";

export type TunnelHighlightToggleProps = {
	/** Whether cross-wing tunnels are currently shown. */
	active: boolean;
	/** Number of cross-wing tunnels mapped onto the graph (undefined while loading). */
	tunnelCount?: number;
	onToggle: () => void;
};

/**
 * "Show tunnels" toggle (12.7), mirroring the layout segmented-control styling.
 * Pressing it flips cross-wing tunnel visibility; the `T` keybind drives the same
 * action. Disabled when there are no tunnels to show (MCP offline / empty palace).
 */
export const TunnelHighlightToggle: FC<TunnelHighlightToggleProps> = (props) => {
	const { active, tunnelCount, onToggle } = props;
	const hasTunnels = (tunnelCount ?? 0) > 0;

	return (
		<button
			type="button"
			onClick={onToggle}
			disabled={!hasTunnels}
			aria-pressed={active && hasTunnels}
			title={
				hasTunnels
					? "Show cross-wing tunnels (T)"
					: "No cross-wing tunnels to show (MCP offline or none filed)"
			}
			className={`flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
				active && hasTunnels
					? "bg-primary-700 text-primary-50"
					: "text-secondary-600 hover:bg-secondary-100 hover:text-primary-900"
			}`}
		>
			<span>Tunnels</span>
			<span className={`font-mono text-xs ${active && hasTunnels ? "opacity-70" : "opacity-50"}`}>
				T
			</span>
		</button>
	);
};
