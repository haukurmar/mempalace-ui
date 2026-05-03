import { markdown } from "@codemirror/lang-markdown";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { Columns, Eye, FileText } from "lucide-react";
import { type FC, useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "../../primitives/button";
import { Separator } from "../../primitives/separator";
import { Toggle } from "../../primitives/toggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../primitives/tooltip";
import { cn } from "../../lib/utils";

type DrawerEditorMode = "edit" | "create";
type PreviewLayout = "side-by-side" | "source-only" | "preview-only";

export type DrawerEditorProps = {
	value: string;
	onChange: (next: string) => void;
	mode?: DrawerEditorMode;
	previewLayout?: PreviewLayout;
	onSave?: () => void | Promise<void>;
	onCancel?: () => void;
	disabled?: boolean;
	disabledReason?: string;
	placeholder?: string;
	className?: string;
};

const DEFAULT_DISABLED_REASON = "MCP server is unavailable. Reconnect to edit drawers.";

const editorTheme = EditorView.theme({
	"&": {
		fontSize: "13px",
		backgroundColor: "transparent",
		height: "100%",
	},
	".cm-scroller": {
		fontFamily:
			"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
		lineHeight: "1.6",
	},
	".cm-content": {
		padding: "12px 14px",
	},
	".cm-focused": {
		outline: "none",
	},
	".cm-gutters": {
		display: "none",
	},
});

const baseExtensions = [markdown(), EditorView.lineWrapping, editorTheme];

export const DrawerEditor: FC<DrawerEditorProps> = (props) => {
	const {
		value,
		onChange,
		mode = "edit",
		previewLayout: initialLayout = "side-by-side",
		onSave,
		onCancel,
		disabled = false,
		disabledReason = DEFAULT_DISABLED_REASON,
		placeholder,
		className,
	} = props;

	const [layout, setLayout] = useState<PreviewLayout>(initialLayout);
	const [isSaving, setIsSaving] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setLayout(initialLayout);
	}, [initialLayout]);

	const showSource = layout !== "preview-only";
	const showPreview = layout !== "source-only";
	const saveLabel = mode === "create" ? "Add drawer" : "Save";

	const handleSourceOnly = () => {
		setLayout("source-only");
	};

	const handleSideBySide = () => {
		setLayout("side-by-side");
	};

	const handlePreviewOnly = () => {
		setLayout("preview-only");
	};

	const handleSave = useCallback(async () => {
		if (!onSave || disabled || isSaving) return;
		try {
			setIsSaving(true);
			await onSave();
		} finally {
			setIsSaving(false);
		}
	}, [onSave, disabled, isSaving]);

	const handleCancel = useCallback(() => {
		onCancel?.();
	}, [onCancel]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			const node = containerRef.current;
			if (!node) return;
			const editorRoot = node.querySelector(".cm-editor");
			if (editorRoot?.contains(document.activeElement)) return;
			if (!node.contains(document.activeElement)) return;
			event.preventDefault();
			handleCancel();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [handleCancel]);

	const handleChange = (next: string) => {
		onChange(next);
	};

	return (
		<TooltipProvider>
			<div
				ref={containerRef}
				data-slot="drawer-editor"
				data-mode={mode}
				data-layout={layout}
				data-disabled={disabled}
				className={cn(
					"flex h-full min-h-[320px] w-full flex-col overflow-hidden rounded-md border border-secondary-200 bg-primary-0",
					className,
				)}
			>
				<div className="flex items-center justify-between gap-2 border-b border-secondary-200 px-3 py-2">
					<div className="flex items-center gap-1">
						<LayoutToggle
							label="Source only"
							pressed={layout === "source-only"}
							onPressedChange={handleSourceOnly}
							icon={<FileText aria-hidden="true" />}
						/>
						<LayoutToggle
							label="Side by side"
							pressed={layout === "side-by-side"}
							onPressedChange={handleSideBySide}
							icon={<Columns aria-hidden="true" />}
						/>
						<LayoutToggle
							label="Preview only"
							pressed={layout === "preview-only"}
							onPressedChange={handlePreviewOnly}
							icon={<Eye aria-hidden="true" />}
						/>
					</div>
					<div className="flex items-center gap-2">
						{onCancel ? (
							<Button variant="ghost" size="sm" onClick={handleCancel}>
								Cancel
							</Button>
						) : null}
						{onSave ? (
							<SaveButton
								label={saveLabel}
								disabled={disabled}
								disabledReason={disabledReason}
								busy={isSaving}
								onClick={handleSave}
							/>
						) : null}
					</div>
				</div>

				<div
					className={cn(
						"grid min-h-0 flex-1",
						showSource && showPreview ? "grid-cols-2" : "grid-cols-1",
					)}
				>
					{showSource ? (
						<div className="relative flex min-h-0 flex-col overflow-hidden">
							<CodeMirror
								value={value}
								onChange={handleChange}
								extensions={baseExtensions}
								editable={!disabled}
								readOnly={disabled}
								placeholder={placeholder}
								basicSetup={{
									lineNumbers: false,
									foldGutter: false,
									highlightActiveLine: false,
									highlightActiveLineGutter: false,
									autocompletion: false,
								}}
								className="h-full"
							/>
						</div>
					) : null}
					{showSource && showPreview ? (
						<Separator orientation="vertical" className="absolute hidden" />
					) : null}
					{showPreview ? (
						<div
							className={cn(
								"min-h-0 overflow-auto bg-secondary-50 px-5 py-4",
								showSource ? "border-l border-secondary-200" : "",
							)}
						>
							<MarkdownPreview value={value} />
						</div>
					) : null}
				</div>
			</div>
		</TooltipProvider>
	);
};

type LayoutToggleProps = {
	label: string;
	pressed: boolean;
	onPressedChange: () => void;
	icon: React.ReactNode;
};

const LayoutToggle: FC<LayoutToggleProps> = (props) => {
	const { label, pressed, onPressedChange, icon } = props;

	const handlePressed = () => {
		if (!pressed) onPressedChange();
	};

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Toggle size="sm" pressed={pressed} onPressedChange={handlePressed} aria-label={label}>
					{icon}
				</Toggle>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
};

type SaveButtonProps = {
	label: string;
	disabled: boolean;
	disabledReason: string;
	busy: boolean;
	onClick: () => void;
};

const SaveButton: FC<SaveButtonProps> = (props) => {
	const { label, disabled, disabledReason, busy, onClick } = props;

	if (disabled) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<span>
						<Button size="sm" disabled>
							{label}
						</Button>
					</span>
				</TooltipTrigger>
				<TooltipContent>{disabledReason}</TooltipContent>
			</Tooltip>
		);
	}

	return (
		<Button size="sm" onClick={onClick} disabled={busy}>
			{busy ? "Saving…" : label}
		</Button>
	);
};

type MarkdownPreviewProps = {
	value: string;
};

const MarkdownPreview: FC<MarkdownPreviewProps> = (props) => {
	const { value } = props;

	if (!value.trim()) {
		return (
			<p className="text-sm italic text-secondary-700">
				Nothing to preview yet. Start typing on the left.
			</p>
		);
	}

	return (
		<div className="space-y-4 text-sm leading-relaxed text-primary-900 [&_a]:text-primary-700 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-secondary-300 [&_blockquote]:pl-3 [&_blockquote]:text-secondary-700 [&_code]:rounded [&_code]:bg-secondary-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold [&_hr]:border-secondary-200 [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:overflow-auto [&_pre]:rounded-md [&_pre]:bg-secondary-100 [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-semibold [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-secondary-200 [&_th]:bg-secondary-100 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:border-secondary-200 [&_td]:px-2 [&_td]:py-1 [&_ul]:list-disc [&_ul]:pl-5">
			<ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
		</div>
	);
};
