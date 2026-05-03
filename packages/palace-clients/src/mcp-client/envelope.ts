/**
 * MemPalace MCP tools wrap their structured payload as a JSON string
 * inside the standard MCP `content[*].text` slot. Every read wrapper
 * pulls the result through this helper so callers see the typed
 * domain shape and never have to JSON.parse manually.
 */
export const parseToolResult = <T>(raw: unknown): T => {
	if (raw === null || typeof raw !== "object") {
		throw new Error("MCP tool result is not an object");
	}
	const obj = raw as { content?: unknown; isError?: unknown };
	if (obj.isError === true) {
		const text = textFromContent(obj.content);
		throw new Error(`MCP tool returned an error: ${text ?? "unknown"}`);
	}
	const text = textFromContent(obj.content);
	if (text === null) {
		throw new Error("MCP tool result missing text content");
	}
	try {
		return JSON.parse(text) as T;
	} catch (err) {
		throw new Error(`MCP tool result is not valid JSON: ${(err as Error).message}`);
	}
};

const textFromContent = (content: unknown): string | null => {
	if (!Array.isArray(content) || content.length === 0) return null;
	// Spec-conformant servers put text first, but `image`/`resource`
	// items can legitimately appear at index 0 — scan for the first
	// `text` item instead of trusting position.
	for (const item of content) {
		if (item === null || typeof item !== "object") continue;
		const obj = item as { type?: unknown; text?: unknown };
		if (obj.type === "text" && typeof obj.text === "string") {
			return obj.text;
		}
	}
	return null;
};
