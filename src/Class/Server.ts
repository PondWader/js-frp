import FRPBase from "./Base";
import { ServerConf } from "../Types/ServerConf";
import ini from 'ini';

class FRPServer extends FRPBase {
    /**
     * Create a new FRP server instance
     * @param {ServerConf} config The config for the instance
     * @param {string} binariesDir The directory to download the binaries to (optional)
     */
    constructor(config?: ServerConf, binariesDir?: string) {
        super('frps', binariesDir);

        if (config) this._writeConfig(ini.stringify(config));
    }

    /**
     * Set the config for the instance
     * @param {ServerConf} config The config for the instance
     */
    setConfig(config: ServerConf) {
        this._writeConfig(ini.stringify(config));
    }

    /**
     * Set the config with plain text (must be in the `.ini` file type format)
     * @param {string} rawConfig The raw text ini config to be written to the config file
     */
    setConfigRaw(rawConfig: string) {
        this._writeConfig(rawConfig);
    }
};

export default FRPServer;