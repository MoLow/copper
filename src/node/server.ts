import { NodeConfig } from "../grid/grid";
import { StandaloneServer } from "../standalone/server";
import fetch from 'node-fetch';
import { logger } from "../logger";
import { delay, ICopperServerConfig } from "../common/utils";

export class NodeServer extends StandaloneServer {
    constructor(serverConfig: ICopperServerConfig, private config: NodeConfig) {
        super(serverConfig);
    }
    async listen() {
        const result = await super.listen();
        await this.register();
        return result;
    }
    async stop() {
        const result = await super.stop();
        await this.deregister();
        return result;
    }
    async register(retries = 50) {
        try {
            await fetch(`http://${this.config.hubHost}:${this.config.hubPort}/grid/node`, {
                method: 'POST',
                body: JSON.stringify({ config: this.config }),
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (err) {
            if(retries <= 0) {
                throw err;
            }
            logger.error('error registering node. retrying in 5 seconds');
            await delay(5000);
            process.nextTick(() => this.register(retries - 1));
        }
    }
    async deregister(retries = 3) {
        try {
            await fetch(`http://${this.config.hubHost}:${this.config.hubPort}/grid/node`, {
                method: 'DELETE',
                body: JSON.stringify({ config: this.config }),
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (err) {
            if(retries <= 0) {
                throw err;
            }
            logger.error('error deregistering node. retrying in 5 seconds');
            await delay(5000);
            process.nextTick(() => this.deregister(retries - 1));
        }
    }
};
