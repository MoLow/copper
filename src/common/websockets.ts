import * as httpProxy from 'http-proxy';
import { FastifyPluginCallback } from 'fastify';
import { withSessionId } from '../standalone/routes';
import { logger } from '../logger';
import { CreateSessionArgs, SessionOptions } from '../standalone/sessionManager';

export interface IWebSocketHandler {
    getWebSocketUrl: (sessionId: string) => string;
    getSession: (sessionId: string) => { id: string };
    createSession: (options?: CreateSessionArgs) => Promise<{ id: string }>;
}

export interface WebSocketOptions {
    handler: IWebSocketHandler;
    defaultSessionOptions?: SessionOptions;
}

export const registerWebsocket: FastifyPluginCallback<WebSocketOptions> = (app, opts, done) => {
    const { handler, defaultSessionOptions } = opts;
    const defaultOpts = defaultSessionOptions ? { chromeOptions: defaultSessionOptions } : undefined;
    const proxy = httpProxy.createProxyServer({});
    app.server.on('upgrade', async (req, socket, head) => {
        try {
            let [, sessionId] = req.url?.split('/ws/') || [];
            sessionId = (sessionId ?? '').split('/')[0];
            sessionId = sessionId || (await handler.createSession(defaultOpts)).id;
            const target = handler.getWebSocketUrl(sessionId);
            logger.info({ sessionId, target }, 'proxying websocket');
            proxy.ws(req, socket, head, { target, toProxy: true });
        } catch (err) {
            logger.error(err, 'error proxying websocket');
        }
    });

    app.get<withSessionId>('/ws/:sessionId/json/version', async (req) => {
        const session = handler.getSession(req.params.sessionId);
        const webSocketDebuggerUrl = `ws://${req.headers.host}/ws/${session.id}`;
        return { ...session, webSocketDebuggerUrl };
    });

    done();
};
