import fetch from 'node-fetch';
import * as fs from 'fs';
import * as childProcess from 'child_process';
import * as chromedriver from 'chromedriver';
import { StandaloneServer } from '../../src/standalone/server';
import { HubServer } from '../../src/grid/server';
import { NodeServer } from '../../src/node/server';
import { nodeConfig } from '../../src/node/config';
import { copperConfig } from '../../src/standalone/config';
import { Benchmarker, BenchmarkerFlow } from './benchmarker';
import { delay } from '../../src/common/utils';

const ITERATIONS = 200;

const createSession = async <T extends { url: string }>(data: T) => {
    const res = await fetch(`${data.url}/session`, {
        method: 'POST',
        body: JSON.stringify({
            desiredCapabilities: {
                browserName: 'chrome',
                chromeOptions: { args: ['--headless', '--disable-gpu'] },
            },
        }),
        headers: { 'Content-Type': 'application/json' },
    });
    const { sessionId, value } = await res.json();
    return { ...data, sessionId: sessionId || value.sessionId, step: 'create session' };
};
const removeSession = async <T extends { url: string; sessionId: string }>(data: T) => {
    await fetch(`${data.url}/session/${data.sessionId}`, { method: 'DELETE' });
    return { ...data, step: 'remove session' };
};
const navigate = async <T extends { url: string; sessionId: string }>(data: T) => {
    await fetch(`${data.url}/session/${data.sessionId}/url`, {
        method: 'POST',
        body: JSON.stringify({ url: 'https://www.google.com', waitUntil: 'load' }),
        headers: { 'Content-Type': 'application/json' },
    });
    return { ...data, step: 'navigate' };
};

async function measureBasicSession() {
    const chromeDriver = new BenchmarkerFlow(
        { iterations: ITERATIONS, name: 'ChromeDriver' },
        async () => {
            const driver = await chromedriver.start(['--url-base=/wd/hub', '--port=9516'], true);
            return { driver, url: 'http://localhost:9516/wd/hub', step: 'start driver' };
        },
        createSession,
        navigate,
        removeSession,
        async ({ driver }) => {
            driver.kill();
            return { step: 'kill driver' };
        },
    );

    const copperStandalone = new BenchmarkerFlow(
        { iterations: ITERATIONS, name: 'Copper Standalone' },
        async () => {
            const server = new StandaloneServer({ port: 4444, logLevel: 'silent' });
            await server.listen();
            return { server, url: 'http://localhost:4444/wd/hub', step: 'start driver' };
        },
        createSession,
        navigate,
        removeSession,
        async ({ server }) => {
            server.stop();
            return { step: 'kill driver' };
        },
    );

    const copperGrid = new BenchmarkerFlow(
        { iterations: ITERATIONS, name: 'Copper Grid' },
        async () => {
            copperConfig.value.enableW3CProtocol = true;
            const copperHub = new HubServer({ port: 4442, logLevel: 'silent' });
            nodeConfig.value = { hubPort: 4442, port: 4443 };
            const copperNode = new NodeServer({ port: 4443, logLevel: 'silent' });
            await copperHub.listen();
            await copperNode.listen();
            return { copperHub, copperNode, url: 'http://localhost:4442/wd/hub', step: 'start driver' };
        },
        createSession,
        navigate,
        removeSession,
        async ({ copperHub, copperNode }) => {
            nodeConfig.reset();
            await copperNode.stop();
            await copperHub.stop();
            return { step: 'kill driver' };
        },
    );

    const seleniumStandalone = new BenchmarkerFlow(
        { iterations: ITERATIONS, name: 'Selenium Standalone' },
        async () => {
            const server = childProcess.exec(
                `java  -D${chromedriver.path} -jar ./selenium-server-standalone-3.141.59.jar -port 4441`,
                { cwd: __dirname },
            );
            server.stdout?.on('data', (data) => console.log(data.toString()));
            server.stderr?.on('data', (data) => console.log(data.toString()));
            await delay(500);
            return { server, url: 'http://localhost:4441/wd/hub', step: 'start driver' };
        },
        createSession,
        navigate,
        removeSession,
        async ({ server }) => {
            server.kill();
            return { step: 'kill driver' };
        },
    );
    const seleniumGrid = new BenchmarkerFlow(
        { iterations: ITERATIONS, name: 'Selenium Grid' },
        async () => {
            const hubServer = childProcess.exec(
                `java -jar ./selenium-server-standalone-3.141.59.jar -port 4439 -role hub`,
                { cwd: __dirname },
            );
            hubServer.stdout?.on('data', (data) => console.log(data.toString()));
            hubServer.stderr?.on('data', (data) => console.log(data.toString()));
            await delay(500);
            const nodeServer = childProcess.exec(
                `java -jar -D${chromedriver.path} ./selenium-server-standalone-3.141.59.jar -port 4440 -role node -hubPort 4439`,
                { cwd: __dirname },
            );
            nodeServer.stdout?.on('data', (data) => console.log(data.toString()));
            nodeServer.stderr?.on('data', (data) => console.log(data.toString()));
            await delay(1500);
            return { nodeServer, hubServer, url: 'http://localhost:4439/wd/hub', step: 'start driver' };
        },
        createSession,
        navigate,
        removeSession,
        async ({ nodeServer, hubServer }) => {
            nodeServer.kill();
            hubServer.kill();
            return { step: 'kill driver' };
        },
    );

    const marker = new Benchmarker(chromeDriver, copperStandalone, copperGrid, seleniumStandalone, seleniumGrid);
    await marker.run();

    console.log(marker.results);
    fs.writeFileSync(`${__dirname}/results.json`, JSON.stringify(marker.results, null, 2));
}

(async function main() {
    await measureBasicSession();
})()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
