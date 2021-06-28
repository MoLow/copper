import * as httpProxy from 'http-proxy';
import { FastifyPluginCallback } from "fastify";
import { withSessionId } from "../standalone/routes";
import { logger } from '../logger';


export interface IWebSocketHandler {
  getWebSocketUrl: (sessionId: string) => string,
  getSession: (sessionId: string) => ({ id: string }),
  createSession: () => Promise<{ id: string }>,
}

export const registerWebsocket: FastifyPluginCallback<IWebSocketHandler> = (app, opts, done) => {
  const proxy = httpProxy.createProxyServer({ });
  app.server.on('upgrade', async (req, socket, head) => {
    try {
      let [, sessionId] = req.url?.split('/ws/') || [];
      sessionId = (sessionId ?? '').split('/')[0];
      sessionId = sessionId || (await opts.createSession()).id;
      const target = opts.getWebSocketUrl(sessionId);
      logger.info({ sessionId, target }, 'proxying websocket');
      proxy.ws(req, socket, head, { target, toProxy: true  });
    } catch (err) {
      logger.error(err, 'error proxying websocket')
    }
  });

  app.get<withSessionId>('/ws/:sessionId/json/version', async (req) => {
    const session = opts.getSession(req.params.sessionId);
    const webSocketDebuggerUrl = `ws://${req.headers.host}/ws/${session.id}`;
    return { ...session, webSocketDebuggerUrl };
  });


  done();
}