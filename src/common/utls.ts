import { FastifyRequest } from "fastify";

export const addWsUrl = (req: FastifyRequest, session: { id: string }) => {
    return Object.assign({}, session, {
        webSocketDebuggerUrl: `ws://${req.headers.host}/ws/${session.id}`,
        'goog:chromeOptions': {
            debuggerAddress: `${req.headers.host}/ws/${session.id}`
        }
    });
}

export const removeWsUrl = <T>(session: T) => {
    return Object.assign({}, session, {
        webSocketDebuggerUrl: undefined,
        'goog:chromeOptions': undefined,
    });
}