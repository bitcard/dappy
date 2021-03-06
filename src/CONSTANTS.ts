export const CRON_JOBS_SUBSCRIPTION_PERIOD_INFOS = 40 * 1000;
export const RCHAIN_INFOS_EXPIRATION = 0;

export const CRON_JOBS_SUBSCRIPTION_PERIOD_ACCOUNTS = 1 * 60 * 1000;
export const CRON_JOBS_SUBSCRIPTION_PERIOD_NODES = 20 * 60 * 1000;
export const MAX_SIMULTANEOUS_WS_CONNECTIONS = 10;
export const WS_RECONNECT_PERIOD = 10000;
export const WS_PAYLOAD_PAX_SIZE = 256000; // bits

export const REV_TRANSFER_PHLO_LIMIT = 50000000;
export const DEFAULT_PHLO_LIMIT = 50000000;
export const LOGREV_TO_REV_RATE = 100000000;

export const VERSION = '0.3.6';

export const CHAIN_IDS: { [chainId: string]: { name: string; platform: 'rchain' } } = {
  betanetwork: {
    name: 'Beta network',
    platform: 'rchain',
  },
};

export const DEVELOPMENT = typeof location !== 'undefined' && location.host === 'localhost:3033';
