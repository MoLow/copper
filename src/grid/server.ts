import fastify, { FastifyInstance } from 'fastify';
import { registerSessionRoutes } from './sessionRoutes';
import { registerWebsocket } from '../common/websockets';
import { registerErrorHandler } from '../common/errors';
import { registerGridRoutes } from './gridRoutes';
import { grid } from './grid';
import { registerSessionProxy } from './sessionProxy';
import { DEFAULT_URL_PREFIX, delay, ICopperServerConfig } from '../common/utils';

export class HubServer {
    private app: FastifyInstance;
    private port: number;

    constructor({ port, routesPrefix, logLevel, defaultSessionOptions }: ICopperServerConfig) {
        this.port = port;
        this.app = fastify({ logger: { level: logLevel }, bodyLimit: 1024 * 1024 * 100 });

        this.app.register(registerSessionRoutes, { prefix: routesPrefix ?? DEFAULT_URL_PREFIX });
        this.app.register(registerSessionProxy, { prefix: routesPrefix ?? DEFAULT_URL_PREFIX });
        this.app.register(registerGridRoutes, { prefix: '/grid/' });
        this.app.register(registerWebsocket, { handler: grid, defaultSessionOptions });
        this.app.register(registerErrorHandler);
    }
    async listen() {
        return await this.app.listen(this.port);
    }

    async stop() {
        return await Promise.race([this.app.close(), delay(5000)]);
    }
}
