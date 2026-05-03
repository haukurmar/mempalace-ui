/**
 * Maps shadcn primitives' Tailwind utility classes (bg-popover, text-foreground, etc.)
 * to our scale palette so generated tokens.css resolves them.
 * Light-theme defaults; dark-theme support adds a second mapping later.
 */

export const shadcnSemanticMapping = {
	background: "var(--color-secondary-50)",
	foreground: "var(--color-secondary-900)",
	card: "var(--color-secondary-0)",
	"card-foreground": "var(--color-secondary-900)",
	popover: "var(--color-secondary-0)",
	"popover-foreground": "var(--color-secondary-900)",
	primary: "var(--color-primary-500)",
	"primary-foreground": "#FFFFFF",
	secondary: "var(--color-secondary-100)",
	"secondary-foreground": "var(--color-secondary-900)",
	muted: "var(--color-secondary-100)",
	"muted-foreground": "var(--color-secondary-700)",
	accent: "var(--color-secondary-100)",
	"accent-foreground": "var(--color-secondary-900)",
	destructive: "#DC2626",
	"destructive-foreground": "#FFFFFF",
	border: "var(--color-secondary-200)",
	input: "var(--color-secondary-200)",
	ring: "var(--color-primary-500)",
} as const satisfies Record<string, string>;

export type ShadcnSemanticRole = keyof typeof shadcnSemanticMapping;
export type ShadcnSemanticMapping = typeof shadcnSemanticMapping;
