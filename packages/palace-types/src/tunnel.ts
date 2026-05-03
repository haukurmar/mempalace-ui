/**
 * A "tunnel" is a v3.3.4 MemPalace concept — an explicit cross-wing link
 * between two drawers, distinguishing it from implicit similarity edges
 * surfaced by semantic search. Tunnels are first-class palace objects
 * with their own ids and metadata. The graph view highlights them as
 * cross-wing bridges; a drawer's detail panel lists every tunnel it
 * participates in.
 *
 * `sourceDrawerId` and `targetDrawerId` are not symmetric in the schema,
 * but the UI typically renders tunnels as undirected. They are
 * `string | null` because some MCP tools return tunnels with only the
 * wings populated (the drawer endpoints may be omitted or unresolved);
 * consumers must guard before linking. `kind` carries an optional
 * caller-supplied label (e.g. "implements", "references"); leave it
 * unset for plain bidirectional bridges.
 */
export type Tunnel = {
	readonly id: string;
	readonly sourceDrawerId: string | null;
	readonly targetDrawerId: string | null;
	readonly sourceWingId: string;
	readonly targetWingId: string;
	readonly kind?: string;
	readonly createdAt: string;
};
