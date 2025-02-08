import https from "node:https";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import tar from "tar-stream";
import zlib from "node:zlib"
import packageJson from "../package.json" with { type: "json" };

const OUT_DIR = './frp';
const LICENSE_DIST_PATH = './lib/LICENSE';

const frpVersion = packageJson.frpVersion;
const url = `https://codeload.github.com/fatedier/frp/tar.gz/refs/tags/v${frpVersion}`;

function handleError(err) {
    console.error(err);
    if (fs.existsSync(OUT_DIR)) fs.rmSync(OUT_DIR, { recursive: true, force: true });
}
process.on('unhandledRejection', handleError);
process.on('uncaughtException', handleError);

const versionFile = path.join(OUT_DIR, '.version.txt');

if (fs.existsSync(versionFile)) {
    const downloadedVersion = fs.readFileSync(versionFile, 'utf-8');
    if (downloadedVersion.trim() === frpVersion) {
        console.log(`frp v${frpVersion} already downloaded.`);
        process.exit(0);
    }
}

if (fs.existsSync(OUT_DIR)) fs.rmSync(OUT_DIR, { recursive: true, force: true });

process.on('beforeExit', exitCode => {
    if (exitCode === 0) {
        // Finish by writing files
        if (!fs.existsSync(path.dirname(LICENSE_DIST_PATH))) fs.mkdirSync(path.dirname(LICENSE_DIST_PATH));
        fs.copyFileSync(path.join(OUT_DIR, 'LICENSE'), LICENSE_DIST_PATH);
        fs.writeFileSync(versionFile, frpVersion);
    }
});

https.get(url, res => {
    if (res.statusCode !== 200) throw new Error(`Received non-200 status code downloading FRP archive: ${res.statusCode}`);

    const gzip = zlib.createGunzip();
    res.pipe(gzip);

    const extractor = tar.extract();
    gzip.pipe(extractor);

    extractor.on('entry', (headers, stream, next) => {
        const filePath = path.join(OUT_DIR, headers.name.split('/').slice(1).join('/'));

        if (headers.type === 'directory') {
            fs.mkdirSync(filePath);
        } else {
            const writer = fs.createWriteStream(filePath);
            stream.pipe(writer);
        }

        stream.on('end', () => {
            next();
        });
        stream.resume();
    });
});