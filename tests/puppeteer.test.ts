import * as puppeteer from 'puppeteer';
import { expect } from 'chai';
import { NodeServer } from '../src/node/server';
import { HubServer } from '../src/grid/server';
import { copperConfig } from '../src/standalone/config';
import { nodeConfig } from '../src/node/config';
import { StandaloneServer } from '../src/standalone/server';

describe('puppeteer', () => {
    describe('standalone', () => {
        const PORT = 9115;

        let server: StandaloneServer;
        let browser: puppeteer.Browser;
        let page: puppeteer.Page;

        before(async () => {
            copperConfig.value = { defaultSessionOptions: { chromeFlags: ['--headless', '--disable-gpu'] } };
            server = new StandaloneServer({ port: PORT, logLevel: 'silent' });
            await server.listen();
            browser = await puppeteer.connect({ browserWSEndpoint: `ws://localhost:${PORT}` });
            page = (await browser.pages())[0];
        });

        it('has title "Copper e2e"', async () => {
            await page.goto('https://output.jsbin.com/yubehub/3', { waitUntil: 'networkidle0' });
            const title = await page.title();
            expect(title).to.equal('Copper e2e');
        });

        it('Simple type & click', async () => {
            const input = (await page.$('input'))!;
            await input.type('copper');
            const button = (await page.$('button'))!;
            await button.click();
            const text = await page.$('#span');
            expect(await text?.evaluate((el) => el.innerHTML)).to.equal('copper');
        });

        after(async () => {
            copperConfig.reset();
            await browser.close();
            await server.stop();
        });
    });

    describe('grid', () => {
        const NODE_PORT = 9116;
        const HUB_PORT = 9115;

        let node: NodeServer;
        let hub: HubServer;
        let browser: puppeteer.Browser;
        let page: puppeteer.Page;

        before(async () => {
            copperConfig.value = { defaultSessionOptions: { chromeFlags: ['--headless', '--disable-gpu'] } };
            nodeConfig.value = {
                hubHost: 'localhost',
                hubPort: HUB_PORT,
                port: NODE_PORT,
                maxSession: 1,
                nodePolling: 5000,
            };
            hub = new HubServer({ port: HUB_PORT, logLevel: 'silent' });
            node = new NodeServer({ port: NODE_PORT, logLevel: 'silent' });
            await hub.listen();
            await node.listen();
            browser = await puppeteer.connect({ browserWSEndpoint: `ws://localhost:${HUB_PORT}` });
            page = (await browser.pages())[0];
        });

        it('has title "Copper e2e"', async () => {
            await page.goto('https://output.jsbin.com/yubehub/3', { waitUntil: 'networkidle0' });
            const title = await page.title();
            expect(title).to.equal('Copper e2e');
        });

        it('Simple type & click', async () => {
            const input = (await page.$('input'))!;
            await input.type('copper');
            const button = (await page.$('button'))!;
            await button.click();
            const text = await page.$('#span');
            expect(await text?.evaluate((el) => el.innerHTML)).to.equal('copper');
        });

        after(async () => {
            copperConfig.reset();
            nodeConfig.reset();
            await browser.close();
            await node.stop();
            await hub.stop();
        });
    });
});
