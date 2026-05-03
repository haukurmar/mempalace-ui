/**
 * Drawer metadata is the free-form key-value bag attached to every drawer
 * in chromadb. Live MemPalace v3.3.4+ data shows mining adds keys like
 * `entities`, `source_file`, `hall`, `chunk_index`, `filed_at`, `added_by`,
 * `normalize_version`, `room`, `wing`, `source_mtime`. Custom mining
 * pipelines and curation can add anything else, so the shape is open.
 *
 * Values are JSON-compatible scalars / arrays / nested objects. Keep this
 * type recursive so the canonical `MetadataTable` renderer can walk
 * arbitrary nesting without losing type safety.
 */
export type MetadataValue =
	| string
	| number
	| boolean
	| null
	| readonly MetadataValue[]
	| { readonly [key: string]: MetadataValue };

export type MetadataRecord = {
	readonly [key: string]: MetadataValue;
};
