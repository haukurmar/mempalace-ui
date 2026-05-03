import type { Drawer } from "@memui/palace-types/drawer";
import type { Room } from "@memui/palace-types/room";
import type { SearchResponse } from "@memui/palace-types/search";
import type { Tunnel } from "@memui/palace-types/tunnel";
import type { Wing } from "@memui/palace-types/wing";
import {
	type FindTunnelsOpts,
	findTunnels,
	getDrawer,
	getStatus,
	type ListRoomsToolOpts,
	listRooms,
	listWings,
	type McpStatus,
	reconnect,
	type SearchSemanticOpts,
	searchSemantic,
} from "./tools";
import { createMcpTransport, type McpServerInfo, type McpTransportOpts } from "./transport";

export type McpClient = {
	getServerInfo: () => Promise<McpServerInfo>;
	getStatus: () => Promise<McpStatus>;
	getDrawer: (id: string) => Promise<Drawer | null>;
	listWings: () => Promise<Wing[]>;
	listRooms: (opts?: ListRoomsToolOpts) => Promise<Room[]>;
	searchSemantic: (opts: SearchSemanticOpts) => Promise<SearchResponse>;
	findTunnels: (opts?: FindTunnelsOpts) => Promise<Tunnel[]>;
	reconnect: () => Promise<void>;
	dispose: () => Promise<void>;
};

export type CreateMcpClientOpts = McpTransportOpts;

export const createMcpClient = (opts: CreateMcpClientOpts = {}): McpClient => {
	const transport = createMcpTransport(opts);
	return {
		getServerInfo: () => transport.getServerInfo(),
		getStatus: () => getStatus(transport),
		getDrawer: (id) => getDrawer(transport, id),
		listWings: () => listWings(transport),
		listRooms: (o) => listRooms(transport, o),
		searchSemantic: (o) => searchSemantic(transport, o),
		findTunnels: (o) => findTunnels(transport, o),
		reconnect: () => reconnect(transport),
		dispose: () => transport.dispose(),
	};
};

export { IncompatibleMcpError, McpUnavailableError } from "./transport";
export type { McpServerInfo, McpTransportOpts } from "./transport";
export type {
	FindTunnelsOpts,
	ListRoomsToolOpts,
	McpStatus,
	SearchSemanticOpts,
} from "./tools";
