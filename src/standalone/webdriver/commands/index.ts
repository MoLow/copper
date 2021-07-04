import { FastifyPluginCallback } from 'fastify';
import { UnsupportedActionError } from '../../../common/errors';
import { copperConfig } from '../../config';
import { withSessionId } from '../../routes';
import { Session, sessionManager } from '../../sessionManager';
import { elements } from './elements';
import { navigation } from './navigation';

declare module 'fastify' {
    interface FastifyRequest {
        puppeteer: Exclude<Session['puppeteer'], undefined>;
    }
}

export const webdriver: FastifyPluginCallback = (app, opts, done) => {
    app.addHook<withSessionId>('preHandler', async (req, res) => {
        req.puppeteer = sessionManager.getPuppeteer(req.params.sessionId)!;
        if (!copperConfig.value.enableW3CProtocol || !req.puppeteer) {
            throw new UnsupportedActionError(`w3c webdriver protocol is disabled`);
        }
    });

    app.register(navigation);
    app.register(elements);

    app.all<{ Params: { '*': string } }>(`:*`, async (req) => {
        throw new UnsupportedActionError(`unsupported action: ${req.params['*']}`);
    });

    done();
};
