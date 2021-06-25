import * as yargs from "yargs";
import { hideBin} from "yargs/helpers";
import { logger } from "./logger";
import { Server } from "./server";


const args = yargs(hideBin(process.argv))
    .command('standalone', 'start a Copper standalone server')
    .option('port', {
      describe: 'Coppers\'s port',
      default: 9115
    })
    .option('route-prefix', {
      type: 'string',
      default: '/wd/hub/',
      description: 'Run with verbose logging'
    })
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      description: 'Run with verbose logging'
    })
    .argv;


    (async () => {
        try {
          const _args = await args;
          if (!_args._ || !_args._.length) {
            throw new Error('Please run node index.js serve --port=PORT');
          }
          
          const server = new Server(_args.port as number, _args["route-prefix"]);
          await server.listen();
          logger.info('Copper up and listening on port', { port: _args.port });
        } catch (e) {
          logger.error(e);
        }
    })();