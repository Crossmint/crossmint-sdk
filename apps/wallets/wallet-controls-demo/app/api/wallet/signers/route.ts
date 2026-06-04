import { type NextRequest, NextResponse } from "next/server";
import { getWalletsClient, getSignerConfig } from "@/lib/server-wallet";

interface ScopeInput {
    type: "transfer";
    tokenLocator: string;
    spendingLimit?: {
        amount: string;
        interval?: number;
    };
    recipients?: string[];
}

interface AddSignerBody {
    walletAddress: string;
    signerAddress: string;
    scopes: ScopeInput[];
}

export async function GET(request: NextRequest) {
    try {
        const walletAddress = request.nextUrl.searchParams.get("walletAddress");
        if (walletAddress == null) {
            return NextResponse.json({ error: "walletAddress is required" }, { status: 400 });
        }

        const wallets = getWalletsClient();
        const wallet = await wallets.getWallet(walletAddress, { chain: "base-sepolia" });
        const signers = await wallet.signers();

        return NextResponse.json({ signers });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch signers";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body: AddSignerBody = await request.json();
        const { walletAddress, signerAddress, scopes } = body;

        if (walletAddress == null || signerAddress == null) {
            return NextResponse.json({ error: "walletAddress and signerAddress are required" }, { status: 400 });
        }

        const wallets = getWalletsClient();
        const wallet = await wallets.getWallet(walletAddress, { chain: "base-sepolia" });
        // biome-ignore lint/correctness/useHookAtTopLevel: not a React hook
        await wallet.useSigner(getSignerConfig());

        const signerDef = {
            type: "external-wallet" as const,
            address: signerAddress,
        };

        const validScopes = scopes && scopes.length > 0 ? scopes : undefined;
        const signer = await wallet.addSigner(signerDef, {
            prepareOnly: false,
            scopes: validScopes,
        });

        return NextResponse.json({ signer });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to add signer";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { walletAddress, signerAddress } = await request.json();

        if (walletAddress == null || signerAddress == null) {
            return NextResponse.json({ error: "walletAddress and signerAddress are required" }, { status: 400 });
        }

        const wallets = getWalletsClient();
        const wallet = await wallets.getWallet(walletAddress, { chain: "base-sepolia" });
        // biome-ignore lint/correctness/useHookAtTopLevel: not a React hook
        await wallet.useSigner(getSignerConfig());
        await wallet.removeSigner({ type: "external-wallet", address: signerAddress });

        return NextResponse.json({ success: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to remove signer";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
