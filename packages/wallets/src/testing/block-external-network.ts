import net from "node:net";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0", "::"]);

type ConnectArgs =
    | [options: net.SocketConnectOpts, listener?: () => void]
    | [port: number, host: string, listener?: () => void]
    | [port: number, listener?: () => void]
    | [path: string, listener?: () => void];

function tcpTarget(args: ConnectArgs): { host: string; port: number } | undefined {
    const first = args[0];
    if (typeof first === "object") {
        if ("path" in first && first.path) {
            return undefined;
        }
        if ("port" in first) {
            return { host: first.host ?? "localhost", port: first.port };
        }
        return undefined;
    }
    if (typeof first === "string" && Number.isNaN(Number(first))) {
        return undefined;
    }
    return { host: typeof args[1] === "string" ? args[1] : "localhost", port: Number(first) };
}

let currentAllowedHosts = new Set(LOOPBACK_HOSTS);
let patched = false;

function patchConnectOnce(): void {
    if (patched) {
        return;
    }
    patched = true;
    const originalConnect = net.Socket.prototype.connect;

    net.Socket.prototype.connect = function (this: net.Socket, ...args: ConnectArgs): net.Socket {
        const target = tcpTarget(args);
        if (target !== undefined && !currentAllowedHosts.has(target.host)) {
            throw new Error(
                `Blocked outbound connection to "${target.host}:${target.port}". This sandbox suite is hermetic: ` +
                    "stub the dependency instead, or pass it to installNetworkKillSwitch's allowedHosts."
            );
        }
        return Reflect.apply(originalConnect, this, args);
    } as typeof net.Socket.prototype.connect;
}

export function installNetworkKillSwitch(options?: { allowedHosts?: Iterable<string> }): () => void {
    patchConnectOnce();
    const previousAllowedHosts = currentAllowedHosts;
    currentAllowedHosts = new Set([...LOOPBACK_HOSTS, ...(options?.allowedHosts ?? [])]);

    return () => {
        currentAllowedHosts = previousAllowedHosts;
    };
}
