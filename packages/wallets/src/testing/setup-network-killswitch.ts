import { installNetworkKillSwitch } from "./block-external-network";

if (process.env.CROSSMINT_API_KEY == null) {
    const allowedHosts = (process.env.SANDBOX_ALLOWED_HOSTS ?? "")
        .split(",")
        .map((host) => host.trim())
        .filter((host) => host.length > 0);

    installNetworkKillSwitch({ allowedHosts });
}
