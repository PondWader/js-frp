import fs from 'fs/promises';
import path from 'path';
import constants from './constants';
import { DownloaderHelper } from 'node-downloader-helper';
import decompress from 'decompress';

let downloading: Set<string> = new Set();
let resolveAwaiters: { [path: string]: ((value: string) => void)[] } = {};

export default async function downloadFRP(directory?: string) : Promise<string> {
    const platform = process.platform;
    const arch = process.arch;
    
    let release = `frp_${constants.version}`;
    let releaseFile = '';
    
    switch(platform) {
        case "win32":
            release += `_windows_${arch === 'x64' ? 'amd64' : '386'}`;
            releaseFile = release + '.zip';
            break;
            case "freebsd":
                release += `_freebsd_${arch === 'x64' ? 'amd64' : '386'}`;
                releaseFile = release + '.tar.gz';
                break;
                case "darwin":
                    release += `_darwin_${arch === 'arm64' ? 'arm64' : 'amd64'}`;
                    releaseFile = release + '.tar.gz';
                    break;
                    case "linux":
                        release += `_linux_${arch.replace('x64', 'amd64')}`;
                        releaseFile = release + '.tar.gz';
                        break;
    }
    
    if (release === `frp_${constants.version}`) throw new Error(`A release was not found for your operating system (Platform: ${platform} Arch: ${arch})`);
    
    const binariesDir = path.resolve(directory || path.join(__dirname, '../../lib'));
    const binaryPath = path.join(binariesDir, release);

    // If file is already downloading add the promise to an array of promises to be resolved once it's downloaded
    if (downloading.has(binaryPath)) {
        return new Promise((resolve) => {
            if (!resolveAwaiters[binaryPath]) resolveAwaiters[binaryPath] = [];
            resolveAwaiters[binaryPath].push(resolve);
        });
    }
    downloading.add(binaryPath);
    
    // Check if file exists or not
    const stat = await fs.stat(binaryPath).catch(() => {});
    if (stat) {
        await cleanFiles(binaryPath);
        resolvePromises(binaryPath);
        return binaryPath;
    }
    await fs.mkdir(binariesDir).catch(() => {});

    await downloadFiles(binariesDir, releaseFile, binaryPath);

    resolvePromises(binaryPath);
    return binaryPath;
}

function downloadFiles(binariesDir: string, releaseFile: string, binaryPath: string) : Promise<void> {
    return new Promise((resolve, error) => {
        const dl = new DownloaderHelper(`https://github.com/fatedier/frp/releases/download/v${constants.version}/${releaseFile}`, binariesDir, { override: true });
    
        dl.on('end', () => {
            const archivePath = path.join(binariesDir, releaseFile);
            decompress(archivePath, binariesDir).then(async () => {
                await cleanFiles(binaryPath);
                await fs.rm(archivePath);
                resolve();
            });
        })
        dl.on('error', (err) => {
            error(err);
        })
    
        dl.start();
    });
}

async function cleanFiles(dir: string) {
    // Removes useless files (such as example files)
    const files = await fs.readdir(dir);
    
    for await (const file of files) {
        if (file.endsWith('.ini')) await fs.rm(path.join(dir, file)).catch(() => {});
    }
}

function resolvePromises(value: string) {
    downloading.delete(value);
    if (resolveAwaiters[value]) {
        for (const resolve of resolveAwaiters[value]) {
            resolve(value);
        }
        delete resolveAwaiters[value];
    }
}