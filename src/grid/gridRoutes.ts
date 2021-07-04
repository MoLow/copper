import { FastifyPluginCallback } from 'fastify';
import { NodeConfig } from '../node/config';
import { grid } from './grid';

export const registerGridRoutes: FastifyPluginCallback = (app, opts, done) => {
    app.get('/status', async () => {
        return { ready: true, message: 'Copper Grid Is Ready' };
    });

    app.post<{ Body: { config: NodeConfig } }>('/node', async (req) => {
        const host = new URL('http://' + req.hostname);
        const config = { host: host.hostname, ...req.body.config };
        const node = await grid.registerNode(config);
        return { status: 0, nodeId: node.id };
    });

    app.delete<{ Body: { config: NodeConfig } }>('/node', async (req) => {
        const host = new URL('http://' + req.hostname);
        grid.deregisterNode(host.hostname, req.body.config.port);
        return { status: 0 };
    });

    done();
};
