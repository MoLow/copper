import { FastifyPluginCallback } from "fastify";
import { grid } from "./grid";

export const registerGridRoutes: FastifyPluginCallback = (app, opts, done) => {
    app.get('/status', async (req) => {
        return { ready: true, message: 'Copper Grid Is Ready' };
    });

    app.post<{ Body: { config: any } }>('/node', async (req) => {
        const host = new URL('http://' + req.hostname);
        const config = { host: host.hostname, port: host.port,  ...req.body.config }
        const node = await grid.registerNode(config);
        return { status: 0, nodeId: node.id }
    });

    app.delete('/grid', async (req) => {
        const host = new URL('http://' + req.hostname);
        return await grid.deregisterNode(host.host, host.port);
    });

    done();
}