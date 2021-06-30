import fastify, { FastifyInstance } from 'fastify';
import { registerSessionRoutes } from './sessionRoutes';
import { registerWebsocket } from '../common/websockets';
import { registerErrorHandler } from '../common/errors';
import { registerGridRoutes } from './gridRoutes';
import { grid } from './grid';
import { registerSessionProxy } from './sessionProxy';
import { delay, ICopperServerConfig } from '../common/utils';
import { copperConfig } from '../standalone/config';
export class HubServer {
    private app: FastifyInstance;
    private port: number;

    constructor({ port, logLevel }: ICopperServerConfig) {
        this.port = port;
        this.app = fastify({ logger: { level: logLevel }, bodyLimit: 1024 * 1024 * 100 });

        this.app.register(registerSessionRoutes, { prefix: copperConfig.value.routesPrefix });
        this.app.register(registerSessionProxy, { prefix: copperConfig.value.routesPrefix });
        this.app.register(registerGridRoutes, { prefix: '/grid/' });
        this.app.register(registerWebsocket, grid);
        this.app.register(registerErrorHandler);
    }
    async listen() {
        return await this.app.listen(this.port, '0.0.0.0');
    }

    async stop() {
        return await Promise.race([this.app.close(), delay(5000)]);
    }
}
