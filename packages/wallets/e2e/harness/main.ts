import { CrossmintWallets } from "@crossmint/wallets-sdk";

function getParam(name: string) {
    return new URLSearchParams(window.location.search).get(name) ?? "";
}

const apiKey = getParam("apiKey");
const chain = getParam("chain") || "base-sepolia";
const signerType = getParam("signerType") || "evm-api-key";

async function run() {
    const result: any = { success: false, error: null, address: null };
    try {
        const wallets = await CrossmintWallets.from({ apiKey });
        let signer: any;
        if (signerType === "evm-api-key") {
            signer = { type: "apiKey" };
        } else {
            signer = { type: "email", email: "test@example.com" };
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
