export declare const PUBLIC_DNS_SERVERS: {
    readonly cloudflare: {
        readonly name: "Cloudflare";
        readonly primary: "1.1.1.1";
        readonly secondary: "1.0.0.1";
    };
    readonly google: {
        readonly name: "Google";
        readonly primary: "8.8.8.8";
        readonly secondary: "8.8.4.4";
    };
    readonly quad9: {
        readonly name: "Quad9";
        readonly primary: "9.9.9.9";
        readonly secondary: "149.112.112.112";
    };
    readonly opendns: {
        readonly name: "OpenDNS";
        readonly primary: "208.67.222.222";
        readonly secondary: "208.67.220.220";
    };
    readonly level3: {
        readonly name: "Level3";
        readonly primary: "4.2.2.1";
        readonly secondary: "4.2.2.2";
    };
};
export declare const TOP3_DNS_SERVERS: readonly ["cloudflare", "google", "quad9"];
export declare const TEST_DOMAINS: readonly ["google.com", "facebook.com", "youtube.com", "amazon.com", "wikipedia.org", "twitter.com", "instagram.com", "linkedin.com", "github.com", "stackoverflow.com", "reddit.com", "netflix.com", "apple.com", "microsoft.com", "cloudflare.com", "baidu.com", "yahoo.com", "ebay.com", "cnn.com", "bbc.com", "spotify.com", "zoom.us", "adobe.com", "oracle.com"];
export declare const DEFAULT_TIMEOUT = 2000;
export declare const DEFAULT_RETRIES = 1;
export declare const MAX_CONCURRENT_QUERIES = 3;
export declare const WS_HEARTBEAT_INTERVAL = 30000;
export declare const API_ENDPOINTS: {
    readonly DETECT_DNS: "/api/dns/detect";
    readonly START_BENCHMARK: "/api/benchmark/start";
    readonly GET_BENCHMARK: "/api/benchmark/:id";
    readonly GET_HISTORY: "/api/benchmark/history";
    readonly CANCEL_BENCHMARK: "/api/benchmark/:id/cancel";
    readonly EXPORT_RESULTS: "/api/benchmark/:id/export";
};
export declare const WS_EVENTS: {
    readonly CONNECT: "connect";
    readonly DISCONNECT: "disconnect";
    readonly BENCHMARK_START: "benchmark-start";
    readonly BENCHMARK_CANCEL: "benchmark-cancel";
    readonly BENCHMARK_PROGRESS: "benchmark-progress";
    readonly BENCHMARK_RESULT: "benchmark-result";
    readonly BENCHMARK_COMPLETE: "benchmark-complete";
    readonly BENCHMARK_ERROR: "benchmark-error";
};
//# sourceMappingURL=constants.d.ts.map