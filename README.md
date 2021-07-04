[![GitHub Workflow Status (branch)](https://img.shields.io/github/workflow/status/MoLow/copper/test%20project/main)](https://github.com/MoLow/copper/actions?query=branch%3Amain+event%3Apush) [![Codecov branch](https://img.shields.io/codecov/c/github/MoLow/copper/main)](https://codecov.io/gh/MoLow/copper)


# Copper

> Copper is a lightweight node.js library which allows creating Chrome or Chromium browser instances for controlling remotely either using [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/) or [W3C WebDriver Protocol](https://www.w3.org/TR/webdriver/). 



#### Use Cases
 - Run tests on a remote chrome browser, using technologies you already use such as [Puppeteer](https://github.com/puppeteer/puppeteer) or [WebdriverIO](https://github.com/webdriverio/webdriverio)
 - Run [Selenium](https://www.selenium.dev/documentation/en/introduction/) tests without Selenium - Copper simply replaces the Selenium server and compatible to most selenium clients
 - Generate PDF or screenshots of a webpage
 - Any other usage of a remote chromium instance you can think of: scraping, crawling, automating, and probably many more - just use Copper to create a remote Chromium and access it using one of the protocols it exposes: [CDP](https://chromedevtools.github.io/devtools-protocol/) and [WebDriver](https://www.w3.org/TR/webdriver/)

### Getting started

##### Installation
```bash
npm i -g @copperjs/copper
# or
yarn global add @copperjs/copper
```
##### Usage
```bash
copper standalone --port 9115
```
run a puppeteer tests using copper:
```js
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.connect({ browserWSEndpoint: 'ws://localhost:9115' });
  const page = await browser.newPage();
  await page.goto('https://example.com');
  await page.screenshot({ path: 'example.png' });

  await browser.close();
})();
``` 
or run a selenium test using copper:
```js
const webdriverio = require('webdriverio');

(async () => {
  const browser = await webdriverio.remote({ path: '/wd/hub/', hostname: 'localhost', port: 9115 });
  await browser.url('https://example.com');
  await page.saveScreenshot('example.png');

  await browser.deleteSession();
})();
``` 

### Key Features
- Scale out multiple nodes of Copper using a Hub/Node architecture inspired by [Selenium Grid](https://www.selenium.dev/documentation/en/grid/) (Hub/Node).
- Uses pure Node.js - no more complied binaries and jars that must match your browser version. Copper uses [chrome-launcher](https://github.com/GoogleChrome/chrome-launcher/) meaning it will run on any machine with chrome/chromium on it.
- Lightweight and fast - see benchmarks

#### Our Name
<img src="https://user-images.githubusercontent.com/8221854/124395064-be79d900-dd0a-11eb-9953-22d1996c3ca8.png" width="200" align="right">
As you can see - Copper is right in between Chromium and Selenium in the Periodic table. since what Copper does, is kinda between those two - this name was just there for us to use.



### Roadmap
- [x] create docker files for standalone, headless standalone, node, headless node, hub
- [x] write some uts
- [x] write nice readme
- [ ] publish to npm & Dockerhub
- [ ] support w3c Webdriver commands (WIP)
- [ ] support TLS
- [ ] support HTTP2
- [ ] benchmarks
