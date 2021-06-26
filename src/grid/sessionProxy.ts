import * as httpProxy from 'http-proxy';
import { FastifyPluginCallback, FastifyReply, FastifyRequest } from "fastify";
import { grid } from "./grid";

export type withSessionId = { Params: { sessionId: string } };

export const registerSessionProxy: FastifyPluginCallback = (app, opts, done) => {
    const proxy = httpProxy.createProxyServer({ });
    
    app.addContentTypeParser('application/json', function (request, payload, done: any) {
        done()
    });
    app.addContentTypeParser('text/plain', function (request, payload, done: any) {
        done()
    });

    const handleProxy = (req: FastifyRequest<withSessionId>, reply: FastifyReply) => {
        const node = grid.getNode(req.params.sessionId);
        proxy.web(req.raw, reply.raw, { target: node.URL });
    }

    app.get<withSessionId>('/session/:sessionId', handleProxy);
    app.all<withSessionId>('/session/:sessionId/*', handleProxy);

    done();
}