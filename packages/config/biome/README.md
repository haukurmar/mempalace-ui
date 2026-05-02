## Deferred: custom rules for raw hex codes / arbitrary Tailwind values

The bootstrap spec called for lint rules that flag raw hex codes and arbitrary Tailwind values (e.g. `bg-[#ff0000]`, `text-[14px]`) so the design-tokens layer stays the single source of truth. Biome v2's built-in rule set has nothing for this out of the box; implementing it requires a Biome v2 GritQL plugin (or a separate lint pass via a different tool). Deferred until `@memui/ui` and the design-tokens packages exist and the constraint has something to enforce against.
