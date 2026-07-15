import { EventEmitter } from 'events';
import download from '../FRPUtil/download';
import fs from 'fs';
import path from 'path';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { Readable } from 'stream';

interface Events {
    started: [];
    spawned: [];
    closed: [code: number | null];
    message: [message: string];
    error: [err: Error];
}

export default interface FRPBase {
    /**
     * Listen for events emitted from the instance of FRPBase
     */
    on<K extends keyof Events>(event: K, listener: (...args: Events[K]) => any | void): this;
    /**
     * Listen for the first call of events emitted from the instance of FRPBase
     */
    once<K extends keyof Events>(event: K, listener: (...args: Events[K]) => any | void): this;
    /**
     * Emit an event
    */
    emit<K extends keyof Events>(event: K, ...args: Events[K]): boolean;
}

export default class FRPBase extends EventEmitter {
    private executableName: string;
    private binaryDir: string | undefined;
    private downloadPromise: Promise<void>;
    private lockStream?: fs.ReadStream;
    public id: number;
    public process: ChildProcessWithoutNullStreams | null;
    public stdout: Readable | null;

    constructor(executableName: string, binariesDir?: string) {
        super();

        this.executableName = executableName;
        this.downloadPromise = this._download(binariesDir);
        this.id = Math.floor(Math.random() * 1000000);
        this.process = null;
        this.stdout = null;
    }

    private async _download(directory?: string) {
        this.binaryDir = await download(directory);
    }

    async _writeConfig(conf: string) {
        await this.downloadPromise;
        if (this.lockStream) this.lockStream.destroy();
        await fs.promises.writeFile(this.getConfigPath()!, conf);
        this.lockStream = fs.createReadStream(this.getConfigPath()!);
    }

    /**
     * Start the FRP instance
     */
    async start() {
        if (this.process) return;
        await this.downloadPromise;
        const args = [
            '-c',
            this.getConfigPath() as string
        ];
        this.process = spawn(path.join(this.binaryDir as string, process.platform === 'win32' ? this.executableName + '.exe' : this.executableName), args);
        this.stdout = this.process.stdout;
        this.process.once('spawn', () => {
            this.emit('spawned');
        })
        this.process.once('close', (code) => {
            this.process = null;
            this.emit('closed', code);
        })
        this.stdout.on('data', (data) => {
            this.emit('message', data.toString().trim());
        })
        this.process.on('error', (err) => {
            this.emit('error', err);
        })
        this.emit('started');
    }

    /**
     * Stop the FRP instance
     */
    stop() {
        if (this.process) return this.process.kill();
        return false;
    }

    /**
     * Get the file location where the configuration file is written
     */
    getConfigPath() {
        if (!this.binaryDir) return null;
        return path.join(this.binaryDir as string, `tmp_conf_${this.id}.ini`);
    }

    /**
     * Destroy the instance, including removing the configuration file
     */
    async destroy() {
        this.stop();
        this.process = null;
        this.lockStream?.destroy();
        await fs.promises.rm(this.getConfigPath()!);
    }
};