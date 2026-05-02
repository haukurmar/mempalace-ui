---
name: frontend
description: Frontend development methodology for mempalace-ui — TanStack Start app, @memui/ui design system, tokens, stories. Use when implementing routes, components, layouts, or design tokens.
---

# Frontend

You implement frontend code for mempalace-ui: routes and server functions in `apps/web`, components in `@memui/ui`, design tokens in `@memui/design-tokens`, stories in `apps/app-storybook`. Treat the design system as the project's identity — generic shadcn-on-Tailwind output is unacceptable.

## Pre-flight reads

**You MUST read [`.agents/docs/frontend/react-patterns.md`](../../docs/frontend/react-patterns.md) in full before writing any code.** Non-negotiable — every TypeScript, React, component-decomposition, and form pattern in this project lives there. Skipping it produces output that does not match project conventions and will be rejected by `review-agent`.

Also read, every time:

1. `CLAUDE.md` — orchestrator rules, skills layout, guidelines pointer
2. The relevant capability spec under `openspec/changes/<change>/specs/<capability>/spec.md` — acceptance scenarios for the work you're doing
3. The relevant phase block in `openspec/changes/<change>/tasks.md` — your task list

If the work touches design tokens or the primitive layer, also read `openspec/changes/<change>/design.md` (D4 design system architecture).

## Hard rules

- **No raw hex codes or arbitrary Tailwind values** anywhere outside `@memui/design-tokens`. Always reference tokens.
- **No bare primitive imports in pages.** `apps/web` consumes composed components from `@memui/ui`; only `@memui/ui` imports the shadcn primitives in `packages/ui/src/primitives/`.
- **Every composed component has a `.stories.tsx` neighbor** covering empty / loading / error / success states.
- **No direct SQLite writes.** Mutations go through `mempalace-mcp` via `@memui/palace-clients`. SQLite is read-only WAL.
- **Use `@memui/*` workspace imports**, never relative cross-package paths.
- **TypeScript:** arrow functions, `type` over `interface`, `FC` from React (not `React.FC`), `import type` for type-only imports, no inline event handlers.
- **No new dependencies** without surfacing the choice to the orchestrator first.

## Workflow per task

Follow [`.agents/skills/verification/SKILL.md`](../verification/SKILL.md) — the per-task section is the single source of truth for what "done" means in this project (typecheck, lint, mark `[x]`, report summary, hard list of what NOT to do). Every developer agent in mempalace-ui obeys it.

In short: implement only the task's scope; run `pnpm check-types` and `pnpm lint` on your changed packages; mark `[x]` only when clean; report what you built, which scenarios it satisfies, and anything you punted on. Never commit, push, or dispatch other agents.

## Style cues

- File naming: `PascalCase.tsx` for components, `camelCase.ts` for hooks/utilities.
- Co-locate state components: `DrawerListLoading.tsx`, `DrawerListError.tsx`, `DrawerListEmpty.tsx` in the same folder as `DrawerList.tsx`.
- Extract Item components for any list — never inline JSX in `.map()`.
- Forms use Zod schemas with type inferred via `z.infer`; validation is centralized in a custom hook.

## Audio alert when tasks are complete

Run `afplay /System/Library/Sounds/Submarine.aiff` at the end of tasks, or when user input is needed to proceed.
