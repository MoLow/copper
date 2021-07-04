import 'make-promises-safe';
import * as fs from 'fs';
import * as yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { logger } from './logger';
import { StandaloneServer } from './standalone/server';
import { HubServer } from './grid/server';
import { NodeServer } from './node/server';
import { copperConfig } from './standalone/config';
import { nodeConfig } from './node/config';
import { gridConfig } from './grid/config';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require('../package.json');

const args = yargs(hideBin(process.argv))
    .command('standalone', 'start a Copper standalone server')
    .command('hub', 'start a Copper hub')
    .command('node', 'start a Copper node')
    .option('port', {
        describe: "Copper's port",
        default: 9115,
    })
    .option('version', {
        alias: 'v',
        describe: 'print version',
        type: 'boolean',
    })
    .option('config', {
        alias: 'c',
        describe: 'configuration json file',
        type: 'string',
    })
    .option('silent', {
        type: 'boolean',
    })
    .parseSync();

const parseJsonFile = (config?: string) => {
    try {
        return config ? JSON.parse(fs.readFileSync(config, 'utf-8')) : {};
    } catch (err) {
        throw new Error('configuration is invalid');
    }
};

const ServerFactory = { standalone: StandaloneServer, node: NodeServer, hub: HubServer } as const;
const configStores = [copperConfig, nodeConfig, gridConfig];

type modes = keyof typeof ServerFactory;

(async () => {
    console.log(`Copper version ${version}`);
    if (args.version) {
        return;
    }
    const mode: modes = (args._[0] as any) || 'standalone';
    if (!ServerFactory[mode]) {
        console.error(`unknown command ${mode}. run copper --help for more information`);
        return;
    }
    try {
        const config = parseJsonFile(args.config);
        config.port = config.port || args.port;
        configStores.forEach((store) => {
            store.value = config;
        });
        if (args.silent) {
            logger.level = 'silent';
        }

        const server = new ServerFactory[mode]({
            port: config.port,
            logLevel: args.silent ? 'silent' : 'info',
        });
        await server.listen();
        logger.info(`Copper ${mode} up and listening on port ${config.port}`);
    } catch (e) {
        logger.error(e);
    }
})();
