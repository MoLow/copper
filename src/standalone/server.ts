import fastify, { FastifyInstance } from 'fastify';
import { registerRoutes } from './routes';
import { registerWebsocket } from '../common/websockets';
import { sessionManager } from './sessionManager';
import { registerErrorHandler } from '../common/errors';
import { DEFAULT_URL_PREFIX, ICopperServerConfig } from '../common/utils';

export class StandaloneServer {
    private app: FastifyInstance;
    private port: number;

    constructor({ port, routesPrefix, logLevel }: ICopperServerConfig) {
        this.port = port;
        this.app = fastify({ logger: { level: logLevel }, bodyLimit: 1024 * 1024 * 100 });

        this.app.register(registerRoutes, {
            prefix: routesPrefix ?? DEFAULT_URL_PREFIX,
            throwOnUnsupportedAction: false,
            port: this.port,
        });
        this.app.register(registerWebsocket, sessionManager);
        this.app.register(registerErrorHandler);
    }
    async listen() {
        return await this.app.listen(this.port);
    }

    async stop() {
        return await this.app.close();
    }
}
