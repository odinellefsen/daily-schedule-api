import { zodEnv } from "../env";
import { app } from "./index";

const defaultLocalApiBaseUrl = "http://localhost:3030";
const defaultLocalApiPort = "3030";
const rawLocalApiBaseUrl = zodEnv.LOCAL_IP ?? defaultLocalApiBaseUrl;
const localApiBaseUrl = rawLocalApiBaseUrl.includes("://")
    ? rawLocalApiBaseUrl
    : `http://${rawLocalApiBaseUrl}`;

let localApiUrl: URL;
try {
    localApiUrl = new URL(localApiBaseUrl);
} catch {
    localApiUrl = new URL(defaultLocalApiBaseUrl);
}
const localApiHostname = localApiUrl.hostname;
const resolvedLocalApiPort = localApiUrl.port || defaultLocalApiPort;
const resolvedLocalApiPortNumber = Number(resolvedLocalApiPort);
const appFetchHandler = app.fetch;

const serverConfig: {
    port: number;
    fetch: typeof app.fetch;
    hostname?: string;
} = {
    port: resolvedLocalApiPortNumber,
    fetch: appFetchHandler,
};

if (localApiHostname) {
    serverConfig.hostname = localApiHostname;
}

export default serverConfig;
