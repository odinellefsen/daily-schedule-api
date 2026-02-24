import { zodEnv } from "../env";
import { app } from "./index";

const defaultLocalApiBaseUrl = "http://localhost:3030";
const rawLocalApiBaseUrl = zodEnv.LOCAL_IP ?? defaultLocalApiBaseUrl;
const localApiBaseUrl = rawLocalApiBaseUrl.includes("://")
    ? rawLocalApiBaseUrl
    : `http://${rawLocalApiBaseUrl}`;

let localApiUrl: URL | undefined;
try {
    localApiUrl = new URL(localApiBaseUrl);
} catch {
    localApiUrl = new URL(defaultLocalApiBaseUrl);
}

const serverConfig: {
    port: number;
    fetch: typeof app.fetch;
    hostname?: string;
} = {
    port: Number(localApiUrl?.port || "3030"),
    fetch: app.fetch,
};

if (localApiUrl?.hostname) {
    serverConfig.hostname = localApiUrl.hostname;
}

export default serverConfig;
