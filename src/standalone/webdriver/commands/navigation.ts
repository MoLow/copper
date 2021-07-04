import { FastifyPluginCallback } from 'fastify';
import { PuppeteerLifeCycleEvent } from 'puppeteer-core';
import { WebdriverError } from '../../../common/errors';

export const navigation: FastifyPluginCallback = (app, opts, done) => {
    app.post<{ Body: { url: string; waitUntil?: PuppeteerLifeCycleEvent } }>('/url', async (req) => {
        const { url, waitUntil } = req.body;
        if (!url) {
            throw new WebdriverError('Missing URL');
        }

        await req.puppeteer.page.goto(url, { waitUntil: waitUntil ?? 'networkidle0' });
        return { status: 0, value: null, state: 'success' };
    });

    app.get('/url', async (req) => {
        const value = await req.puppeteer.page.url();
        return { status: 0, value, state: 'success' };
    });

    app.post<{ Body: { waitUntil?: PuppeteerLifeCycleEvent } }>('/back', async (req) => {
        const { waitUntil } = req.body;
        await req.puppeteer.page.goBack({ waitUntil: waitUntil ?? 'networkidle0' });
        return { status: 0, value: null, state: 'success' };
    });

    app.post<{ Body: { waitUntil?: PuppeteerLifeCycleEvent } }>('/forward', async (req) => {
        const { waitUntil } = req.body;
        await req.puppeteer.page.goForward({ waitUntil: waitUntil ?? 'networkidle0' });
        return { status: 0, value: null, state: 'success' };
    });

    app.post<{ Body: { waitUntil?: PuppeteerLifeCycleEvent } }>('/refresh', async (req) => {
        const { waitUntil } = req.body;
        await req.puppeteer.page.reload({ waitUntil: waitUntil ?? 'networkidle0' });
        return { status: 0, value: null, state: 'success' };
    });

    app.get('/title', async (req) => {
        const value = await req.puppeteer?.page.title();
        return { status: 0, value, state: 'success' };
    });

    done();
};
