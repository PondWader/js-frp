import { Worker } from "node:worker_threads";
import path from "node:path";
import { EventEmitter } from "node:stream";
import type { ClientConf } from "./types/ClientConf";
import type { ServerConf } from "./types/ServerConf";

export const frpVersion: string = require('../package.json').frpVersion;

class FRP<T extends ClientConf | ServerConf> extends EventEmitter {
    // @ts-expect-error - defined with Object.defineProperty
    readonly type: 'client' | 'server';
    #config?: string;
    #worker?: Worker;

    constructor(type: 'client' | 'server') {
        super();

        if (type !== 'client' && type !== 'server') {
            throw new Error('Invalid frp type, must be "client" or "server".');
        }

        Object.defineProperty(this, 'type', {
            value: type,
            writable: false,
            configurable: false
        })
    }

    setConfig(config: T | string) {
        this.#config = typeof config === 'string' ? config : JSON.stringify(config);
        return this;
    }

    /**
     * Starts the FRP instance. A config must be set before calling this method.
     */
    start() {
        if (this.#config === undefined) throw new Error('A config has not been set before starting the FRP instance.');
        if (this.#worker !== undefined) throw new Error('FRP instance is already running.');

        const worker = new Worker(path.join(__dirname, './worker/worker.cjs'), {
            workerData: {
                bin: this.type === 'client' ? 'frpc' : 'frps',
                config: this.#config
            }
        });

        worker.on('message', msg => {
            this.emit('message', msg.toString().trim());
        });
        worker.on('exit', () => {
            this.emit('exit');
            this.#worker = undefined;
        })
        worker.on('error', err => {
            this.emit('error', err);
        });
        this.#worker = worker;
        this.emit('started');

        return this;
    }

    /**
     * Stops the currently running FRP instance. Returns `true` if the instance was running, otherwise returns `false`.
     */
    async stop(): Promise<boolean> {
        if (this.#worker) {
            await this.#worker.terminate();
            this.#worker = undefined;
            return true;
        }
        return false;
    }
}

export class FRPClient extends FRP<ClientConf> {
    constructor(config?: ClientConf | string) {
        super('client');
        if (typeof config !== 'undefined') this.setConfig(config);
    }
}

export class FRPServer extends FRP<ServerConf> {
    constructor(config?: ServerConf | string) {
        super('server');
        if (typeof config !== 'undefined') this.setConfig(config);
    }
}

/**
 * Starts a new FRPClient or FRPServer instance immediately.
 */
export function start<T extends 'client' | 'server'>(
    type: T,
    config: (T extends 'client' ? ClientConf : T extends 'server' ? ServerConf : never) | string
):
    T extends 'client' ? FRPClient :
    T extends 'server' ? FRPServer : never {
    if (type === 'client') {
        return new FRPClient(config).start() as any;
    } else if (type === 'server') {
        return new FRPServer(config).start() as any;
    };

    throw new Error('Invalid frp type, must be "client" or "server".');
}

export { ClientConf, ServerConf };
