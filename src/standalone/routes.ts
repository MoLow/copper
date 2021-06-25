import { FastifyPluginCallback } from "fastify";
import { CopperError, UnsupportedActionError } from "../errors";
import { logger } from "../logger";
import { sessionManager, SessionOptions } from "./sessionManager";

export type withSessionId = { Params: { sessionId: string } };


export const registerRoutes: FastifyPluginCallback<{ webdriverCompatible: boolean, throwOnUnsupportedAction: boolean, port: number }> = (app, opts, done) => {
    app.get('/status', async (req) => {
        return { ready: true, message: 'Copper Is Ready' };
    });
  
    app.get('/sessions', async (req) => {
        const value = sessionManager.listSessions();
        return { statue: 0, value };
    });

    app.post<{ Body: { chromeOptions?: SessionOptions, desiredCapabilities?: any } }>('/session', async (req) => {
        const session = await sessionManager.createSession(req.body?.chromeOptions, req.body?.desiredCapabilities);
        const webSocketDebuggerUrl = `ws://${req.headers.host}/ws/${session.id}`;
        let value: any = { ...session, webSocketDebuggerUrl };
        if (opts.webdriverCompatible) {
            value['goog:chromeOptions'] = {
                debuggerAddress: `${req.headers.host}/ws/${session.id}`
            };
        }
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

export const registerErrorHandler: FastifyPluginCallback = (app, opts, done) => {
    app.setErrorHandler(async function (error, request, reply) {
        if(error instanceof CopperError) {
            reply
                .code(error.statusCode)
                .serializer((a :string) => a)
                .header("content-type", "application/json; charset=utf-8")
                .send(JSON.stringify(error));
        }
        logger.error("Request Error", error.message, error.stack);
        reply.send(500);
    });
    done();
  };