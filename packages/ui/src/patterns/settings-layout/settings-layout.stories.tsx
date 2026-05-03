import { EmptyState } from "@memui/ui/components";
import { Button } from "@memui/ui/primitives";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SettingsLayout } from "./settings-layout";

const meta: Meta<typeof SettingsLayout> = {
	title: "Patterns/SettingsLayout",
	component: SettingsLayout,
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component:
					"Configuration page archetype: a fixed-width left nav listing sections, a flex-1 right pane rendering the active section. The optional header slot anchors a page-wide bar (page title, save action). Both nav and pane scroll independently. Use this for any settings, preferences, or configuration surface.",
			},
		},
	},
	decorators: [
		(Story) => (
			<div className="h-screen w-full">
				<Story />
			</div>
		),
	],
};

export default meta;

type Story = StoryObj<typeof SettingsLayout>;

const sections = [
	{ id: "connection", label: "Connection" },
	{ id: "density", label: "Density" },
	{ id: "keyboard", label: "Keyboard shortcuts" },
	{ id: "health", label: "Health" },
] as const;

type SettingsNavProps = {
	activeId?: string;
};

const SettingsNav = (props: SettingsNavProps) => {
	const { activeId = "connection" } = props;
	return (
		<nav aria-label="Settings sections" className="flex flex-col gap-0.5 p-2">
			{sections.map((section) => {
				const isActive = section.id === activeId;
				return (
					<a
						key={section.id}
						href={`#${section.id}`}
						aria-current={isActive ? "page" : undefined}
						className={
							isActive
								? "rounded-md bg-primary-100 px-3 py-1.5 text-sm font-medium text-primary-900"
								: "rounded-md px-3 py-1.5 text-sm text-primary-800 transition-colors hover:bg-primary-50"
						}
					>
						{section.label}
					</a>
				);
			})}
		</nav>
	);
};

const connectionPane = (
	<div className="flex flex-col gap-6 p-6">
		<header className="flex flex-col gap-1">
			<h2 className="text-lg font-semibold text-primary-900">Connection</h2>
			<p className="text-sm text-secondary-700">
				Where mempalace-ui finds your palace and the MCP server.
			</p>
		</header>
		<dl className="flex flex-col gap-3 font-mono text-xs">
			<div className="flex flex-col gap-1">
				<dt className="text-secondary-700">Palace path</dt>
				<dd className="rounded-md border border-secondary-200 bg-secondary-0 px-3 py-2 text-primary-900">
					~/.mempalace/palace/
				</dd>
			</div>
			<div className="flex flex-col gap-1">
				<dt className="text-secondary-700">MCP server</dt>
				<dd className="rounded-md border border-secondary-200 bg-secondary-0 px-3 py-2 text-primary-900">
					mempalace-mcp (resolved on PATH)
				</dd>
			</div>
		</dl>
	</div>
);

const longPane = (
	<div className="flex flex-col gap-6 p-6">
		<header className="flex flex-col gap-1">
			<h2 className="text-lg font-semibold text-primary-900">Keyboard shortcuts</h2>
			<p className="text-sm text-secondary-700">
				Every shortcut available across mempalace-ui. The pane scrolls independently of the nav.
			</p>
		</header>
		{Array.from({ length: 24 }, (_, i) => (
			<section key={i} className="flex flex-col gap-2">
				<h3 className="text-sm font-medium text-primary-900">Section {i + 1}</h3>
				<p className="text-sm text-secondary-700">
					Placeholder content for keyboard shortcuts section {i + 1}. The pane should scroll while
					the left nav remains pinned.
				</p>
			</section>
		))}
	</div>
);

const headerBar = (
	<div className="flex w-full items-center justify-between">
		<h1 className="text-base font-semibold text-primary-900">Settings</h1>
		<Button size="sm">Save changes</Button>
	</div>
);

export const Default: Story = {
	args: {
		nav: <SettingsNav activeId="connection" />,
		pane: connectionPane,
	},
};

export const WithHeader: Story = {
	args: {
		nav: <SettingsNav activeId="connection" />,
		pane: connectionPane,
		header: headerBar,
	},
};

export const LongPane: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"The pane scrolls independently of the nav so a long settings section never pushes the nav off-screen.",
			},
		},
	},
	args: {
		nav: <SettingsNav activeId="keyboard" />,
		pane: longPane,
	},
};

export const NoActiveSection: Story = {
	args: {
		nav: <SettingsNav activeId="" />,
		pane: (
			<div className="flex h-full w-full items-center justify-center">
				<EmptyState
					title="Select a section"
					description="Pick a section on the left to configure it."
				/>
			</div>
		),
	},
};
