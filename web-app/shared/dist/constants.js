export const PUBLIC_DNS_SERVERS = {
    cloudflare: { name: 'Cloudflare', primary: '1.1.1.1', secondary: '1.0.0.1' },
    google: { name: 'Google', primary: '8.8.8.8', secondary: '8.8.4.4' },
    quad9: { name: 'Quad9', primary: '9.9.9.9', secondary: '149.112.112.112' },
    opendns: { name: 'OpenDNS', primary: '208.67.222.222', secondary: '208.67.220.220' },
    level3: { name: 'Level3', primary: '4.2.2.1', secondary: '4.2.2.2' }
};
export const TOP3_DNS_SERVERS = ['cloudflare', 'google', 'quad9'];
export const TEST_DOMAINS = [
    'google.com',
    'facebook.com',
    'youtube.com',
    'amazon.com',
    'wikipedia.org',
    'twitter.com',
    'instagram.com',
    'linkedin.com',
    'github.com',
    'stackoverflow.com',
    'reddit.com',
    'netflix.com',
    'apple.com',
    'microsoft.com',
    'cloudflare.com',
    'baidu.com',
    'yahoo.com',
    'ebay.com',
    'cnn.com',
    'bbc.com',
    'spotify.com',
    'zoom.us',
    'adobe.com',
    'oracle.com'
];
export const DEFAULT_TIMEOUT = 2000; // 2 seconds
export const DEFAULT_RETRIES = 1;
export const MAX_CONCURRENT_QUERIES = 3;
export const WS_HEARTBEAT_INTERVAL = 30000; // 30 seconds
export const API_ENDPOINTS = {
    DETECT_DNS: '/api/dns/detect',
    START_BENCHMARK: '/api/benchmark/start',
    GET_BENCHMARK: '/api/benchmark/:id',
    GET_HISTORY: '/api/benchmark/history',
    CANCEL_BENCHMARK: '/api/benchmark/:id/cancel',
    EXPORT_RESULTS: '/api/benchmark/:id/export'
};
export const WS_EVENTS = {
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    BENCHMARK_START: 'benchmark-start',
    BENCHMARK_CANCEL: 'benchmark-cancel',
    BENCHMARK_PROGRESS: 'benchmark-progress',
    BENCHMARK_RESULT: 'benchmark-result',
    BENCHMARK_COMPLETE: 'benchmark-complete',
    BENCHMARK_ERROR: 'benchmark-error'
};
