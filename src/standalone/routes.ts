import { FastifyPluginCallback } from "fastify";
import { UnsupportedActionError } from "../common/errors";
import { addWsUrl } from "../common/utls";
import { sessionManager, SessionOptions } from "./sessionManager";

export type withSessionId = { Params: { sessionId: string } };


export const registerRoutes: FastifyPluginCallback<{ throwOnUnsupportedAction: boolean, port: number }> = (app, opts, done) => {
    app.get('/status', async (req) => {
        return { ready: true, message: 'Copper Is Ready' };
    });
  
    app.get('/sessions', async (req) => {
        const value = sessionManager.listSessions();
        return { statue: 0, value };
    });

    app.post<{ Body: { chromeOptions?: SessionOptions, desiredCapabilities?: any } }>('/session', async (req) => {
        const session = await sessionManager.createSession(req.body?.chromeOptions, req.body?.desiredCapabilities);
        const value = addWsUrl(req, session);
        return { status: 0, value, sessionId: session.id };
    });

    app.get<withSessionId>('/session/:sessionId', async (req) => {
        const value = sessionManager.getSession(req.params.sessionId);
        return { status: 0, value, sessionId: value.id };
    });

    app.delete<withSessionId>('/session/:sessionId', async (req, reply) => {
        await sessionManager.removeSession(req.params.sessionId);
        return { status: 0, value: null, sessionId: null, state: 'success' };
    });

    app.all<withSessionId>('/session/:sessionId/*', async (req, reply) => {
        if (opts.throwOnUnsupportedAction) {
            throw new UnsupportedActionError(`unsupported action: ${req.url}`);
        }
        return { status: 0, value: null, state: 'success' };
    });

    done();
}
