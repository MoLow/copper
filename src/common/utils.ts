import { FastifyRequest } from "fastify";
import * as pino from 'pino';

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
export const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const DEFAULT_URL_PREFIX = '/wd/hub/';

export interface ICopperServerConfig {
    port: number,
    routesPrefix?: string,
    logLevel?: pino.LevelWithSilent
}