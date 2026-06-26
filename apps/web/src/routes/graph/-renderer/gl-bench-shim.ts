// @cosmos.gl/graph statically imports gl-bench (a CJS/UMD FPS overlay) whose
// `default` export the Vite / rolldown optimizer can't interop. The /graph
// route never uses cosmos's built-in FPS monitor, so vite.config aliases
// gl-bench to this no-op stub.
export default class GLBenchStub {
	begin() {}
	end() {}
	nextFrame() {}
	update() {}
	dispose() {}
}
