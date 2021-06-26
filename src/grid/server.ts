import fastify, { FastifyInstance } from "fastify";
import { registerSessionRoutes } from "./sessionRoutes";
import { registerWebsocket } from "../common/websockes";
import { registerErrorHandler } from "../common/errors";
import { registerGridRoutes } from "./gridRoutes";
import { grid } from "./grid";
import { registerSessionProxy } from "./sessionProxy";


export class HubServer {
    private app: FastifyInstance;

    constructor(private port: number, routesPrefix?: string) {
        this.app = fastify({ logger: true, bodyLimit: 1024 * 1024 * 100 });
        
        this.app.register(registerSessionRoutes, { prefix: routesPrefix });
        this.app.register(registerSessionProxy, { prefix: routesPrefix });
        this.app.register(registerGridRoutes, { prefix: '/grid/' });
        this.app.register(registerWebsocket, grid);
        this.app.register(registerErrorHandler);
    }
    async listen() {
        return await this.app.listen(this.port);
    }

    async stop() {
        return await this.app.close();
    }
};