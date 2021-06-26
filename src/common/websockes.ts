import * as httpProxy from 'http-proxy';
import { FastifyPluginCallback } from "fastify";
import { withSessionId } from "../standalone/routes";
import { logger } from '../logger';


export const registerWebsocket: FastifyPluginCallback<{ getWebSocketUrl: (sessionId: string) => string, getSession: (sessionId: string) => ({ id: string }) }> = (app, opts, done) => {
  const proxy = httpProxy.createProxyServer({ });
  app.server.on('upgrade', (req, socket, head) => {
    const [, sessionId] = req.url?.split('/ws/') || [];
    const target = opts.getWebSocketUrl(sessionId);
    logger.info({ sessionId, target }, 'proxy websocket');
    proxy.ws(req, socket, head, { target, toProxy: true  });
  });

  app.get<withSessionId>('/ws/:sessionId/json/version', async (req) => {
    const session = opts.getSession(req.params.sessionId);
    const webSocketDebuggerUrl = `ws://${req.headers.host}/ws/${session.id}`;
    return { ...session, webSocketDebuggerUrl };
  });


  done();
}