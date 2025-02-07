import child_process from "node:child_process";
import fs from "node:fs";

// Builder script to patch Go's wasm_exec to avoid polluting globalThis and copy over license.

function prefixLines(str, prefix) {
    return str.split('\n').map(l => prefix + l).join('\n');
}

function destructure(objectName, values) {
    return `const { ${values.join(', ')} } = ${objectName};`
}

const GOROOT = child_process.execSync('go env GOROOT').toString().trim();
const GOLICENSE = fs.readFileSync(`${GOROOT}/LICENSE`, 'utf-8').replaceAll('\r', '').trim();

const wasm_exec = fs.readFileSync(`${GOROOT}/misc/wasm/wasm_exec.js`, 'utf-8').replaceAll('\r', '').trim();

let out = prefixLines(GOLICENSE, '// ') + '\n\n';
out += '// Go wasm_exec.js ($GOROOT/misc/wasm/wasm_exec.js) embedding\n\n';
out += wasm_exec;

fs.writeFileSync('./lib/wasm_exec.js', out);