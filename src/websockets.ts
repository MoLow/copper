import { FastifyPluginCallback } from "fastify";
import { logger } from "./logger";
import { sessionManager} from "./sessionManager";
import * as WebSocket from 'ws';
import { withSessionId } from "./routes";


function liftErrorCode (code: number) {
    if (typeof code !== 'number') {
      // Sometimes "close" event emits with a non-numeric value
      return 1011
    } else if (code === 1004 || code === 1005 || code === 1006) {
      // ws module forbid those error codes usage, lift to "application level" (4xxx)
      return 4000 + (code % 1000)
    } else {
      return code
    }
  }
  
  function closeWebSocket (socket: WebSocket, code: number, reason: string) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.close(liftErrorCode(code), reason)
    }
  }
  
  function waitConnection (socket: WebSocket, write: () => void) {
    if (socket.readyState === WebSocket.CONNECTING) {
      socket.once('open', write)
    } else {
      write()
    }
  }
  


export const registerWebsocket: FastifyPluginCallback = (app, opts, done) => {
    const ws = new WebSocket.Server({ server: app.server });
    ws.on('connection', (source, req) => {
        const [, sessionId] = req.url?.split('/ws/') || [];
        const target = sessionManager.getSessionWebsocket(sessionId);
        logger.info('proxy websocket', { sessionId });
        
        function close (code: any, reason: string) {
            closeWebSocket(source, code, reason)
            closeWebSocket(target, code, reason)
        }
    
        source.on('message', data => waitConnection(target, () => target.send(data)))
        source.on('ping', data => waitConnection(target, () => target.ping(data)))
        source.on('pong', data => waitConnection(target, () => target.pong(data)))
        source.on('close', close)
        source.on('error', error => close(1011, error.message))
        source.on('unexpected-response', () => close(1011, 'unexpected response'))
    
        target.on('message', data => source.send(data))
        target.on('ping', data => source.ping(data))
        target.on('pong', data => source.pong(data))
        target.on('close', close)
        target.on('error', error => close(1011, error.message))
        target.on('unexpected-response', () => close(1011, 'unexpected response'))
    });

    app.get<withSessionId>('/ws/:sessionId/json/version', async (req) => {
        const session = sessionManager.getSession(req.params.sessionId);
        const webSocketDebuggerUrl = `ws://${req.headers.host}/ws/${session.id}`;
        return { ...session, webSocketDebuggerUrl };
    });

    app.addHook('onClose', (instance, done) => ws.close(done))
    done();
}