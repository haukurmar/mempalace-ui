import { EmptyState } from "@memui/ui/components";
import { useCommandPalette } from "@memui/ui/keyboard";
import { Button } from "@memui/ui/primitives";
import { createFileRoute } from "@tanstack/react-router";
import type { FC } from "react";

const HomePage: FC = () => {
	const { setOpen } = useCommandPalette();

	const handleOpenCommandBar = () => {
		setOpen(true);
	};

	return (
		<main className="flex min-h-screen items-center justify-center p-6">
			<div className="w-full max-w-xl rounded-lg border border-secondary-200 bg-card p-6 shadow-sm">
				<EmptyState
					title="MemPalace UI is up"
					description="Connect your palace via server functions in the next phase."
					action={
						<Button onClick={handleOpenCommandBar} variant="default">
							Open Cmd+K
						</Button>
					}
				/>
			</div>
		</main>
	);
};

export const Route = createFileRoute("/")({
	component: HomePage,
});
