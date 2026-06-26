import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { RouteProgressBar } from "./route-progress-bar";

const meta: Meta<typeof RouteProgressBar> = {
	title: "Components/RouteProgressBar",
	component: RouteProgressBar,
	parameters: { layout: "fullscreen" },
};

export default meta;

type Story = StoryObj<typeof RouteProgressBar>;

const SUBMIT_DELAY_MS = 1400;

/** Toggle `active` by hand to watch the bar creep to ~90% and hold, then
 *  complete and fade when switched off. */
export const Toggle: Story = {
	render: () => {
		const [active, setActive] = useState(false);

		const handleToggle = () => {
			setActive((prev) => !prev);
		};

		return (
			<div className="relative h-64 bg-primary-1000 p-8">
				<RouteProgressBar active={active} />
				<button
					type="button"
					onClick={handleToggle}
					className="rounded-md bg-primary-400 px-4 py-2 text-sm font-medium text-primary-1000"
				>
					{active ? "Resolve navigation" : "Start navigation"}
				</button>
			</div>
		);
	},
};

/** Simulates a real route change: the bar fills, holds, then completes after the
 *  pending navigation resolves. */
export const SimulatedNavigation: Story = {
	render: () => {
		const [active, setActive] = useState(false);

		const handleNavigate = () => {
			setActive(true);
		};

		useEffect(() => {
			if (!active) return;
			const timer = window.setTimeout(() => setActive(false), SUBMIT_DELAY_MS);
			return () => window.clearTimeout(timer);
		}, [active]);

		return (
			<div className="relative h-64 bg-primary-1000 p-8">
				<RouteProgressBar active={active} />
				<button
					type="button"
					onClick={handleNavigate}
					disabled={active}
					className="rounded-md bg-primary-400 px-4 py-2 text-sm font-medium text-primary-1000 disabled:opacity-50"
				>
					Navigate
				</button>
			</div>
		);
	},
};
