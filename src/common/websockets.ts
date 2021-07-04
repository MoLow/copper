import * as httpProxy from 'http-proxy';
import { FastifyPluginCallback } from 'fastify';
import { withSessionId } from '../standalone/routes';
import { logger } from '../logger';
import { CreateSessionArgs } from '../standalone/sessionManager';
import { copperConfig } from '../standalone/config';

export interface IWebSocketHandler {
    getWebSocketUrl: (sessionId: string) => string;
    getSession: (sessionId: string) => { id: string };
    createSession: (options?: CreateSessionArgs) => Promise<{ id: string }>;
}

export const registerWebsocket: FastifyPluginCallback<IWebSocketHandler> = (app, handler, done) => {
    const getDefaultOpts = () => {
        return copperConfig.value.defaultSessionOptions
            ? { chromeOptions: copperConfig.value.defaultSessionOptions }
            : undefined;
    };
    const proxy = httpProxy.createProxyServer({});

    proxy.on('error', (err) => logger.error(err, 'websocket proxy error'));

    app.server.on('upgrade', async (req, socket, head) => {
        try {
            let [, sessionId] = req.url.split('/ws/');
            sessionId = (sessionId ?? '').split('/')[0];
            sessionId = sessionId || (await handler.createSession(getDefaultOpts())).id;
            const target = handler.getWebSocketUrl(sessionId);
            logger.info({ sessionId, target }, 'proxying websocket');
            proxy.ws(req, socket, head, { target, toProxy: true });
        } catch (err) {
            logger.error(err, 'error proxying websocket');
            socket.end();
        }
    });

    app.get<withSessionId>('/ws/:sessionId/json/version', async (req) => {
        const session = handler.getSession(req.params.sessionId);
        const webSocketDebuggerUrl = `ws://${req.headers.host}/ws/${session.id}`;
        return { ...session, webSocketDebuggerUrl };
    });

    done();
};
