import { NodeConfig } from "../grid/grid";
import { StandaloneServer } from "../standalone/server";
import fetch from 'node-fetch';

export class NodeServer extends StandaloneServer {
    constructor(port: number, routesPrefix: string, private config: NodeConfig) {
        super(port, routesPrefix);
    }
    async listen() {
        const result = await super.listen();
        await fetch(`http://${this.config.hubHost}:${this.config.hubPort}/grid/node`, {
            method: 'POST',
            body: JSON.stringify({ config: this.config }),
            headers: { 'Content-Type': 'application/json' }
        });
        return result;
    }
    async stop() {
        const result = await super.stop();
        await fetch(`http://${this.config.hubHost}:${this.config.hubPort}/grid/node`, { method: 'DELETE' });
        return result;
    }
};
