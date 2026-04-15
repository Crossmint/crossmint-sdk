import type { SignerType } from "../types/signer";

export function getSignerLocator(s: any): string {
    if (typeof s === "string") return s;
    if (s.signer) return s.signer;
    if (s.locator) return s.locator;
    if (s.type === "email" && s.email) return `email:${s.email}`;
    if (s.type === "phone" && s.phone) return `phone:${s.phone}`;
    if (s.type === "device") return s.publicKey ? `device:${s.publicKey}` : "device:";
    if (s.type === "passkey" && s.id) return `passkey:${s.id}`;
    if (s.type === "external-wallet" && s.address) return `external-wallet:${s.address}`;
    if (s.type === "server" && s.address) return `server:${s.address}`;
    if (s.type) return s.type;
    return JSON.stringify(s);
}

export function signerLabel(s: any): string {
    const loc = getSignerLocator(s);
    const [type] = loc.split(":");
    const rest = loc.slice(type.length + 1);
    if (rest == null || rest === "") return loc;
    if (rest.length > 20) return `${type}: ${rest.slice(0, 8)}...${rest.slice(-8)}`;
    return `${type}: ${rest}`;
}

export function buildSignerConfig(type: SignerType, fields: Record<string, string>) {
    const config: Record<string, string> = { type };
    if (type === "passkey") {
        if (fields.id) config.id = fields.id;
        if (fields.name) config.name = fields.name;
    } else if (type === "external-wallet") {
        if (fields.address) config.address = fields.address;
    }
    return config;
}

export function locatorToSignerConfig(locator: string): any {
    const [type, ...rest] = locator.split(":");
    const value = rest.join(":");
    switch (type) {
        case "device":
            return { type: "device", locator };
        case "passkey":
            return { type: "passkey", id: value, locator };
        case "email":
            return { type: "email", email: value };
        case "phone":
            return { type: "phone", phone: value };
        case "server":
            return { type: "server", address: value };
        case "external-wallet":
            return { type: "external-wallet", address: value };
        default:
            return { type: locator };
    }
}
