import 'make-promises-safe';
import * as fs from 'fs';
import * as yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { logger } from './logger';
import { StandaloneServer } from './standalone/server';
import { HubServer } from './grid/server';
import { NodeServer } from './node/server';
import { DEFAULT_URL_PREFIX } from './common/utils';

const args = yargs(hideBin(process.argv))
    .command('standalone', 'start a Copper standalone server')
    .command('node', 'start a Copper node', (yargs) =>
        yargs.option('config', { describe: 'node configuration json file', type: 'string' }),
    )
    .command('hub', 'start a Copper hub', (yargs) =>
        yargs.option('config', { describe: 'hub configuration json file', type: 'string' }),
    )
    .option('port', {
        describe: "Copper's port",
        default: 9115,
    })
    .option('default-session-options', {
        describe: 'json file defining default options for a session created via websocket',
        type: 'string',
    })
    .option('route-prefix', {
        type: 'string',
        default: DEFAULT_URL_PREFIX,
        description: 'Run with verbose logging',
    })
    .option('silent', {
        type: 'boolean',
    }).argv;

const ServerFactory = {
    standalone: StandaloneServer,
    node: NodeServer,
    hub: HubServer,
} as const;

const parseJsonFile = (config?: string, fallback: any = {}) => {
    try {
        return config ? JSON.parse(fs.readFileSync(config, 'utf-8')) : fallback;
    } catch (err) {
        throw new Error('configuration is invalid');
    }
};

(async () => {
    try {
        const _args = await args;

        const command = (_args._[0] as keyof typeof ServerFactory) || 'standalone';
        const config = parseJsonFile(_args.config);
        const port: number = config.port || _args.port;
        if (_args.silent) {
            logger.level = 'silent';
        }

        const server = new ServerFactory[command](
            {
                port,
                routesPrefix: _args['route-prefix'],
                logLevel: _args.silent ? 'silent' : 'info',
                defaultSessionOptions: parseJsonFile(_args['default-session-options'], null),
            },
            config,
        );
        await server.listen();
        logger.info(`Copper ${command} up and listening on port ${port}`);
    } catch (e) {
        logger.error(e);
    }
})();
