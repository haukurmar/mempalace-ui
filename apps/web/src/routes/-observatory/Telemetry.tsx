import type { CSSProperties, FC } from "react";

export type TelemetryProps = {
	/** The actual palace name/basename — shown as the location subtitle. */
	location: string;
	totalDrawers: number | undefined;
	schemaVersion: number | undefined;
	/** MCP server version when connected, else null (offline/incompatible). */
	mcpVersion: string | null;
	/** Whether the palace change-watcher reports a live connection. */
	live: boolean;
};

const rootStyle: CSSProperties = { animationDelay: "620ms" };

const Separator: FC = () => <span className="text-secondary-500/40">·</span>;

/**
 * Instrument-panel telemetry: a location subtitle over a single dim mono line of
 * the palace's vitals. The trailing dot pulses while the change-watcher is live,
 * like a heartbeat on an observatory console.
 */
export const Telemetry: FC<TelemetryProps> = (props) => {
	const { location, totalDrawers, schemaVersion, mcpVersion, live } = props;

	return (
		<div
			style={rootStyle}
			className="observatory-rise pointer-events-none flex flex-col items-center gap-1.5"
		>
			<span className="font-mono text-[10px] uppercase tracking-[0.4em] text-secondary-400/65">
				{location}
			</span>
			<div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 font-mono text-xs tracking-wide text-secondary-300/55">
				<span>
					<span className="text-secondary-200/80">{(totalDrawers ?? 0).toLocaleString()}</span>{" "}
					memories
				</span>
				<Separator />
				<span>schema {schemaVersion ?? "—"}</span>
				<Separator />
				<span>mcp {mcpVersion ?? "offline"}</span>
				<Separator />
				<span className="inline-flex items-center gap-1.5">
					live
					<span
						className={`inline-block h-1.5 w-1.5 rounded-full ${
							live
								? "bg-primary-300 shadow-[0_0_8px_2px_var(--color-primary-400)] observatory-pulse"
								: "bg-secondary-600"
						}`}
					/>
				</span>
			</div>
		</div>
	);
};
