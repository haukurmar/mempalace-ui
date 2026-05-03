import { EmptyState } from "@memui/ui/components";
import { createFileRoute } from "@tanstack/react-router";
import type { FC } from "react";

const BrowseIndex: FC = () => {
	return (
		<div className="flex h-full items-center justify-center">
			<EmptyState
				title="Pick a wing"
				description="Choose a wing in the sidebar to see its drawers."
			/>
		</div>
	);
};

export const Route = createFileRoute("/browse/")({
	component: BrowseIndex,
});
