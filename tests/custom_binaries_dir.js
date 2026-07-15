const fs = require("node:fs");
const path = require("node:path");

const { FRPClient } = require("../dist");

async function run() {
    const customPath = path.resolve("./binaries");
    const client = new FRPClient({}, customPath);
    await client.start();
    await new Promise((resolve, reject) => {
        client.on("message", (message) => {
            if (message.includes(`start frpc service for config file [${client.getConfigPath()}]`)) resolve();
            else reject(new Error("frpc did not start as expected.\nOutput: " + message));
        });
        setTimeout(() => {
            reject(new Error("frpc did not start within 5 seconds."));
        }, 5000);
    });
    client.stop();
    try {
        if (!fs.existsSync(client.getConfigPath()) || customPath !== path.resolve(client.getConfigPath()).split(path.sep).slice(0, -2).join(path.sep))
            throw new Error("frpc config file does not exist in the custom binaries directory.");
    } finally {
        await fs.promises.rm(customPath, { recursive: true, force: true });
    }
}

module.exports = {
    name: "Custom Binaries Directory Test",
    run,
}