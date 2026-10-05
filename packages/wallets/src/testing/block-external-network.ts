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

// Captured once, lazily, so a second install() (e.g. a test overriding the suite-wide
// setupFiles installation with its own allowedHosts) replaces the active patch instead of
// wrapping it — otherwise "call through to the original" would reach the first install's
// wrapper rather than node:net itself, and its allowedHosts would win regardless of the
// second call's own configuration.
let trueOriginalConnect: typeof net.Socket.prototype.connect | undefined;

export function installNetworkKillSwitch(options?: { allowedHosts?: Iterable<string> }): () => void {
    trueOriginalConnect ??= net.Socket.prototype.connect;
    const originalConnect = trueOriginalConnect;
    const allowedHosts = new Set([...LOOPBACK_HOSTS, ...(options?.allowedHosts ?? [])]);

    net.Socket.prototype.connect = function (this: net.Socket, ...args: ConnectArgs): net.Socket {
        const target = tcpTarget(args);
        if (target !== undefined && !allowedHosts.has(target.host)) {
            throw new Error(
                `Blocked outbound connection to "${target.host}:${target.port}". This sandbox suite is hermetic: ` +
                    "stub the dependency instead, or pass it to installNetworkKillSwitch's allowedHosts."
            );
        }
        return Reflect.apply(originalConnect, this, args);
    } as typeof net.Socket.prototype.connect;

    return () => {
        net.Socket.prototype.connect = originalConnect;
    };
}
