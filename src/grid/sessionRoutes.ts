import { FastifyPluginCallback } from "fastify";
import { grid } from "./grid";
import { addWsUrl } from '../common/utls';

export type withSessionId = { Params: { sessionId: string } };


export const registerSessionRoutes: FastifyPluginCallback = (app, opts, done) => {
    app.get('/status', async (req) => {
        return { ready: true, message: 'Copper Grid Is Ready' };
    });

    app.get('/sessions', async (req) => {
        const value = grid.listSessions();
        return { statue: 0, value };
    });

    app.post<{ Body: any }>('/session', async (req) => {
        const session = await grid.createSession(JSON.stringify(req.body));
        const value = addWsUrl(req, session);
        return { status: 0, value, sessionId: session.id };
    });

    app.delete<withSessionId>('/session/:sessionId', async (req) => {
        return await grid.removeSession(req.params.sessionId);
    });

    done();
}