import { ConfigStore } from '../common/configStore';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GridConfig {}

export const gridConfig = new ConfigStore<GridConfig>({});
