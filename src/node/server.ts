import fetch from 'node-fetch';
import { StandaloneServer } from '../standalone/server';
import { logger } from '../logger';
import { delay, ICopperServerConfig } from '../common/utils';
import { nodeConfig } from './config';

export class NodeServer extends StandaloneServer {
    constructor(serverConfig: ICopperServerConfig) {
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
            await fetch(`http://${nodeConfig.value.hubHost}:${nodeConfig.value.hubPort}/grid/node`, {
                method: 'POST',
                body: JSON.stringify({ config: nodeConfig.value }),
                headers: { 'Content-Type': 'application/json' },
            });
        } catch (err) {
            if (retries <= 0) {
                throw err;
            }
            logger.error('error registering node. retrying in 5 seconds');
            await delay(5000);
            process.nextTick(() => this.register(retries - 1));
        }
    }
    async deregister(retries = 3) {
        try {
            await fetch(`http://${nodeConfig.value.hubHost}:${nodeConfig.value.hubPort}/grid/node`, {
                method: 'DELETE',
                body: JSON.stringify({ config: nodeConfig.value }),
                headers: { 'Content-Type': 'application/json' },
            });
        } catch (err) {
            if (retries <= 0) {
                throw err;
            }
            logger.error('error deregistering node. retrying in 5 seconds');
            await delay(2500);
            process.nextTick(() => this.deregister(retries - 1));
        }
    }
}
