import fastify, { FastifyInstance } from "fastify";
import { registerErrorHandler, registerRoutes, withSessionId } from "./routes";
import { registerWebsocket } from "../websockes";
import { sessionManager } from "./sessionManager";


export class StandaloneServer {
    private app: FastifyInstance;

    constructor(private port: number, routesPrefix?: string) {
        this.app = fastify({ logger: true, bodyLimit: 1024 * 1024 * 100 });
        
        this.app.register(registerRoutes, { prefix: routesPrefix, throwOnUnsupportedAction: false, webdriverCompatible: true, port: this.port });
        this.app.register(registerWebsocket, sessionManager);
        this.app.register(registerErrorHandler);
    }
    async listen() {
        return await this.app.listen(this.port);
    }

    async stop() {
        return await this.app.close();
    }
};