import * as puppeteer from 'puppeteer';
import { expect } from "chai";
import { NodeServer } from '../src/node/server';
import { HubServer } from '../src/grid/server';

const NODE_PORT = 9116;
const HUB_PORT = 9115;

describe('grid e2e', () => {
  let node: NodeServer;
  let hub: HubServer;
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;

  before(async () => {
    hub = new HubServer({ port: HUB_PORT, logLevel: 'silent' });
    node = new NodeServer({ port: NODE_PORT, logLevel: 'silent' }, { hubHost: 'localhost', hubPort: HUB_PORT, port: NODE_PORT, maxSession: 1, nodePolling: 5000 });
    await hub.listen();
    await node.listen();
    browser = await puppeteer.connect({ browserWSEndpoint: `ws://localhost:${HUB_PORT}` });
    page = (await browser.pages())[0];
  });

  it('has title "Google"', async () => {
    await page.goto('https://google.com', { waitUntil: 'networkidle0' })
    const title = await page.title()
    expect(title).to.equal('Google')
  });

  it('Simple type & click', async () => {
    await page.type('input[name=q]', 'copper', { delay: 100 })
    await page.click('input[type="submit"]')
  });

  after(async () => {
    await browser.close();
    await node.stop();
    await hub.stop();
  });
});