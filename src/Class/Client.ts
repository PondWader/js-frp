import FRPBase from "./Base";
import { ClientConf } from "../Types/ClientConf";
import ini from 'ini';

class FRPClient extends FRPBase {
    /**
     * Create a new FRP client instance
     * @param {ClientConf} config The config for the instance
     * @param {string} binariesDir The directory to download the binaries to (optional)
     */
    constructor(config?: ClientConf, binariesDir?: string) {
        super('frpc', binariesDir);

        if (config) this._writeConfig(ini.stringify(config));
    }

    /**
     * Set the config for the instance
     * @param {ClientConf} config The config for the instance
     */
    setConfig(config: ClientConf) {
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

export default FRPClient;