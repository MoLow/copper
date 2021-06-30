import { ConfigStore } from '../common/configStore';
import { SessionOptions } from './sessionManager';

export interface CopperConfig {
    routesPrefix: string;
    enableW3CProtocol?: boolean;
    defaultSessionOptions?: SessionOptions;
}

export const copperConfig = new ConfigStore<CopperConfig>({
    routesPrefix: '/wd/hub/',
});
