const { parentPort, workerData } = require('node:worker_threads');
const path = require('node:path');
const fs = require('node:fs');

const textDecoder = new TextDecoder();

// Setup globals for use in Go's wasm_exec.js
globalThis.require = require;
globalThis.fs = require("./vfs.js").createVfs({
    [workerData.bin + '.toml']: Buffer.from(workerData.config)
}, (_, buf) => {
    parentPort.postMessage(textDecoder.decode(buf));
});

// Resolve frp paths
const LIB_PATH = "../../lib";
const WASM_EXEC_PATH = path.join(LIB_PATH, "wasm_exec.js");
const WASM_BIN_PATH = path.join(__dirname, LIB_PATH, workerData.bin + '.wasm');

// Load Go's wasm_exec.js
require(WASM_EXEC_PATH);

// Setup Go wasm bindings
const go = new Go();
go.argv = [WASM_BIN_PATH, '-c', workerData.bin + '.toml'];
go.env = Object.assign({ TMPDIR: require("os").tmpdir() }, process.env);
go.exit = process.exit;

// Instantiate the web assembly binary
WebAssembly.instantiate(fs.readFileSync(WASM_BIN_PATH), go.importObject).then((result) => {
    process.on("exit", (code) => { // Node.js exits if no event handler is pending
        if (code === 0 && !go.exited) {
            // deadlock, make Go print error and stack traces
            go._pendingEvent = { id: 0 };
            go._resume();
        }
    });
    return go.run(result.instance);
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
