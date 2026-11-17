import { installNetworkKillSwitch } from "./block-external-network";

const allowedHosts = (process.env.SANDBOX_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim())
    .filter((host) => host.length > 0);

installNetworkKillSwitch({ allowedHosts });
