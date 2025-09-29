import { CrossmintWallets } from "@crossmint/wallets-sdk";

function getParam(name: string) {
    return new URLSearchParams(window.location.search).get(name) ?? "";
}

const apiKey = getParam("apiKey");
const chain = getParam("chain") || "base-sepolia";
const signerType = getParam("signerType") || "api-key";

async function run() {
    const result: any = { success: false, error: null, address: null };
    try {
        const wallets = await CrossmintWallets.from({ apiKey });
        let signer: any;
        if (signerType === "api-key") {
            signer = { type: "apiKey" };
        } else if (signerType === "email") {
            signer = { type: "email", email: "test@example.com" };
        } else {
            signer = { type: "apiKey" };
        }
        const wallet = await wallets.getOrCreateWallet({ chain, signer });
        result.success = Boolean(wallet?.address);
        result.address = wallet?.address ?? null;
    } catch (e: any) {
        result.error = e?.message || String(e);
    }
    (window as any).__E2E_RESULT__ = result;
}

run();
