const fs = require("node:fs");
const path = require("node:path");

const testFiles = fs.globSync(path.join(__dirname, "*.js")).filter(file => file !== __filename);
const tests = testFiles.map(file => require(file));

ANSI_RESET = "\x1b[0m";
ANSI_RED = "\x1b[0;31m";
ANSI_GREEN = "\x1b[0;32m";
ANSI_BLUE = "\x1b[0;34m";

async function runTests() {
    console.info(`Running ${tests.length} tests...`);
    let index = 0;
    let failed = 0;
    for (const test of tests) {
        index++;
        let error;
        try {
            await test.run();
        } catch (err) {
            failed++;
            error = err || new Error("Unknown error");
        }
        finally {
            const statusString = error ? `${ANSI_RED}failed!${ANSI_RESET}` : `${ANSI_GREEN}passed${ANSI_RESET}`;
            console.info(`${ANSI_BLUE}${index}. ${test.name}: ${statusString}${ANSI_RESET}`);
            if (error) console.error(error);
        }
    }
    if (failed > 0) {
        console.error(`${ANSI_RED}${failed}/${tests.length} tests failed!${ANSI_RESET}`);
    } else {
        console.info(`${ANSI_GREEN}All tests passed.${ANSI_RESET}`);
    }
    process.exit(0);
}

runTests();