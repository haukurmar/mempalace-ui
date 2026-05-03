## @memui/design-tokens

Framework-neutral design tokens for mempalace-ui. The current consumer is Tailwind v4 via the generated CSS preset; the same TS modules are also imported directly when token values need to be reused outside of CSS (e.g. graph color modes).

---

### Layers

| Layer | Location | Purpose |
|-------|----------|---------|
| **Grid** | `src/grid.ts` | 4pt base unit (`GRID_UNIT`) and `size()` helper. Foundational — not a scale. |
| **Colors** | `src/colors/` | Color families — `teal`, `sand`. Typed as `ColorFamily`, entries are `ColorSwatch` (`{ background, contrast }`). Never reference theme. |
| **Palette** | `src/palette.ts` | Maps brand roles (`primary`, `secondary`) to color families. |
| **Spacing** | `src/spacing.ts` | Named spacing tokens derived from the grid. |
| **Radius** | `src/radius.ts` | Border radius tokens derived from the grid. |
| **Typography** | `src/typography.ts` | Font roles (`body`, `heading`, `mono`), sizes, weights. |
| **Breakpoints** | `src/breakpoints.ts` | Min-width breakpoints in logical pixels. |
| **Z-Indices** | `src/zIndices.ts` | Named z-index layers for stacking-context management. |
| **Shadcn semantic** | `src/shadcn-semantic.ts` | Maps shadcn role classes (`bg-popover`, `text-foreground`, `border-border`, `ring-ring`, etc.) to scale tokens. |

Semantic and component tokens get added empirically as real UI patterns emerge — not speculatively up front.

---

### Common tasks

#### Change the brand color

Edit `src/palette.ts` — swap the import that assigns `primary` (or `secondary`).

#### Add a new scale value (spacing, radius, etc.)

Edit the relevant top-level file in `src/` directly. If the value is a one-off, prefer `size(n)` at the call site:

```ts
import { size } from "@memui/design-tokens";
// Preferred: use named tokens
padding: spacing.regular   // 16

// Escape hatch: reach for size() directly
marginTop: size(3)         // 12 — not in the scale, used once
```

If the same `size(n)` value keeps recurring, promote it to the scale.

---

### Subpath exports

| Subpath | File | What it exports |
|---------|------|-----------------|
| `@memui/design-tokens` | `src/index.ts` | Everything (re-exports all below) |
| `@memui/design-tokens/grid` | `src/grid.ts` | `GRID_UNIT`, `size()` |
| `@memui/design-tokens/colors` | `src/colors/index.ts` | `teal`, `sand` color families |
| `@memui/design-tokens/palette` | `src/palette.ts` | `palette`, `primary`, `secondary` |
| `@memui/design-tokens/spacing` | `src/spacing.ts` | `spacing` |
| `@memui/design-tokens/radius` | `src/radius.ts` | `radius` |
| `@memui/design-tokens/typography` | `src/typography.ts` | `typography` + type exports |
| `@memui/design-tokens/breakpoints` | `src/breakpoints.ts` | `breakpoints` |
| `@memui/design-tokens/zIndices` | `src/zIndices.ts` | `zIndices` |
| `@memui/design-tokens/shadcn-semantic` | `src/shadcn-semantic.ts` | `shadcnSemanticMapping` + types |
| `@memui/design-tokens/tailwind` | `src/adapters/tailwind.ts` | `toTailwindTheme()`, `toShadcnSemanticTheme()` — emit `@theme` blocks as strings |
| `@memui/design-tokens/tailwind.preset.css` | `dist/tailwind.preset.css` | Pre-built Tailwind v4 preset, generated from the modules above |

```ts
import { palette }          from "@memui/design-tokens";             // everything
import { teal, sand }       from "@memui/design-tokens/colors";      // color families
import { spacing }          from "@memui/design-tokens/spacing";
import { size, GRID_UNIT }  from "@memui/design-tokens/grid";        // grid foundation
import { zIndices }         from "@memui/design-tokens/zIndices";
import { toTailwindTheme }  from "@memui/design-tokens/tailwind";    // adapter
```

In a Tailwind v4 stylesheet:

```css
@import "@memui/design-tokens/tailwind.preset.css";
```

---

### Shadcn semantic tokens

shadcn primitives use Tailwind utility classes that resolve through a layer of role-named CSS variables (`--color-background`, `--color-foreground`, `--color-card`, `--color-card-foreground`, `--color-popover`, `--color-popover-foreground`, `--color-primary`, `--color-primary-foreground`, `--color-secondary`, `--color-secondary-foreground`, `--color-muted`, `--color-muted-foreground`, `--color-accent`, `--color-accent-foreground`, `--color-destructive`, `--color-destructive-foreground`, `--color-border`, `--color-input`, `--color-ring`).

The mapping from those roles to our scale tokens lives in `src/shadcn-semantic.ts` — single source of truth. The generator emits it as a sibling `@theme inline { ... }` block in `dist/tailwind.preset.css` (the `inline` keyword is required so Tailwind v4 inlines the nested `var()` references at build time).

Dark-mode support is a future addition: a second mapping object plus a `[data-theme="dark"]` selector wrapping its emitted block. Not shipped yet.

---

### Build

`pnpm build` runs `scripts/generate-tailwind.ts` and writes `dist/tailwind.preset.css`. Run it after any token change so the CSS preset stays in sync with the TS modules.

---

### Current scope

Web only (Tailwind v4). Final color decisions are deferred per the design-system spec — the teal/sand families here are placeholders that satisfy WCAG AA contrast and the requested aesthetic direction (muted teal accent, warm sand neutral). Additional layers (motion, shadows, density modes) will land when real consumers need them.
