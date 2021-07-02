import { Browser, remote } from 'webdriverio';
import { expect } from 'chai';
import { NodeServer } from '../src/node/server';
import { HubServer } from '../src/grid/server';
import { nodeConfig } from '../src/node/config';
import { StandaloneServer } from '../src/standalone/server';
import { copperConfig } from '../src/standalone/config';

const webdriverSettings: any = {
    logLevel: 'silent',
    path: '/wd/hub/',
    capabilities: {
        browserName: 'chrome',
        'goog:chromeOptions': {
            args: ['--headless', '--disable-gpu'],
        },
    },
};

describe('webdriver', () => {
    describe('standalone', () => {
        const PORT = 9115;

        let server: StandaloneServer;
        let browser: Browser<'async'>;

        before(async () => {
            copperConfig.value = { enableW3CProtocol: true };
            server = new StandaloneServer({ port: PORT, logLevel: 'silent' });
            await server.listen();
            browser = await remote({ ...webdriverSettings, port: PORT });
        });

        it('has title "Copper e2e"', async () => {
            await browser.url('https://output.jsbin.com/yubehub/3');
            const title = await browser.getTitle();
            expect(title).to.equal('Copper e2e');
        });

        it('Simple type & click', async () => {
            const input = await browser.$('input');
            await input.setValue('copper');
            const button = await browser.$('button');
            await button.click();
            const text = await browser.$('#span');
            expect(await text.getText()).to.equal('copper');
        });

        after(async () => {
            copperConfig.reset();
            await browser.deleteSession();
            await server.stop();
        });
    });

    describe('grid', () => {
        const NODE_PORT = 9116;
        const HUB_PORT = 9115;

        let node: NodeServer;
        let hub: HubServer;
        let browser: Browser<'async'>;

        before(async () => {
            copperConfig.value = { enableW3CProtocol: true };
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
            browser = await remote({ ...webdriverSettings, port: HUB_PORT });
        });

        it('has title "Copper e2e"', async () => {
            await browser.url('https://output.jsbin.com/yubehub/3');
            const title = await browser.getTitle();
            expect(title).to.equal('Copper e2e');
        });

        it('Simple type & click', async () => {
            const input = await browser.$('input');
            await input.setValue('copper');
            const button = await browser.$('button');
            await button.click();
            const text = await browser.$('#span');
            expect(await text.getText()).to.equal('copper');
        });

        after(async () => {
            copperConfig.reset();
            nodeConfig.reset();
            await node.stop();
            await hub.stop();
        });
    });
});
