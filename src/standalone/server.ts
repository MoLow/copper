import fastify, { FastifyInstance } from 'fastify';
import { registerRoutes } from './routes';
import { registerWebsocket } from '../common/websockets';
import { sessionManager } from './sessionManager';
import { registerErrorHandler } from '../common/errors';
import { delay, ICopperServerConfig } from '../common/utils';
import { copperConfig } from './config';

export class StandaloneServer {
    private app: FastifyInstance;
    private port: number;

    constructor({ port, logLevel }: ICopperServerConfig) {
        this.port = port;
        this.app = fastify({ logger: { level: logLevel }, bodyLimit: 1024 * 1024 * 100 });

        this.app.register(registerRoutes, { prefix: copperConfig.value.routesPrefix });
        this.app.register(registerWebsocket, sessionManager);
        this.app.register(registerErrorHandler);
    }
    async listen() {
        return await this.app.listen(this.port, '0.0.0.0');
    }

    async stop() {
        return await Promise.race([this.app.close(), delay(5000)]);
    }
}
