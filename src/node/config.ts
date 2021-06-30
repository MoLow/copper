import { ConfigStore } from '../common/configStore';

export interface NodeConfig {
    host?: string;
    port: string | number;
    hubHost: string;
    hubPort: string | number;
    maxSession: number;
    nodePolling: number;
    urlPrefix?: string;
}

export const nodeConfig = new ConfigStore<NodeConfig>({
    hubHost: 'localhost',
    hubPort: 9115,
    maxSession: 5,
    nodePolling: 10000,
    port: 9116,
});
