import fastify, { FastifyInstance } from "fastify";
import { registerErrorHandler, registerRoutes } from "./routes";
import { registerWebsocket } from "./websockets";


export class Server {
    private app: FastifyInstance;

    constructor(private port: number, routesPrefix?: string) {
        this.app = fastify({ logger: true, bodyLimit: 1024 * 1024 * 100 });
        
        this.app.register(registerRoutes, { prefix: routesPrefix, throwOnUnsupportedAction: false, webdriverCompatible: true, port: this.port });
        this.app.register(registerWebsocket);
        this.app.register(registerErrorHandler);
    }
    async listen() {
        return await this.app.listen(this.port);
    }

    async stop() {
        return await this.app.close();
    }
};