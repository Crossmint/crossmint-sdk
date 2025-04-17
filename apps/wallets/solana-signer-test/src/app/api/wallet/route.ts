import { NextResponse } from "next/server";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

export async function POST(request: Request) {
    try {
        const data = await request.json();
        const { name } = data;

        // Create a new Solana keypair (wallet)
        const wallet = Keypair.generate();
        const publicKey = wallet.publicKey.toString();
        const secretKey = Buffer.from(wallet.secretKey).toString("hex");

        // Connect to Solana devnet
        const connection = new Connection("https://api.devnet.solana.com", "confirmed");

        // Request an airdrop of SOL for testing (on devnet)
        try {
            const signature = await connection.requestAirdrop(wallet.publicKey, LAMPORTS_PER_SOL);

            // Wait for confirmation
            await connection.confirmTransaction(signature);

            // Get the wallet balance
            const balance = await connection.getBalance(wallet.publicKey);

            return NextResponse.json({
                success: true,
                wallet: {
                    publicKey,
                    secretKey, // Note: In a real app, you would never return this to the client
                    name: name || "Solana Wallet",
                    balance: balance / LAMPORTS_PER_SOL,
                },
            });
        } catch (airdropError) {
            // Return wallet even if airdrop fails
            return NextResponse.json({
                success: true,
                wallet: {
                    publicKey,
                    secretKey, // Note: In a real app, you would never return this to the client
                    name: name || "Solana Wallet",
                    balance: 0,
                    airdropError: "Airdrop failed, but wallet was created.",
                },
            });
        }
    } catch (error) {
        console.error("Error creating wallet:", error);
        return NextResponse.json({ success: false, error: "Failed to create wallet" }, { status: 500 });
    }
}

// Get wallet info
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const publicKey = searchParams.get("publicKey");

    if (!publicKey) {
        return NextResponse.json({ success: false, error: "Public key is required" }, { status: 400 });
    }

    try {
        // Connect to Solana devnet
        const connection = new Connection("https://api.devnet.solana.com", "confirmed");

        // Get the wallet balance
        const balance = await connection.getBalance(new PublicKey(publicKey));

        return NextResponse.json({
            success: true,
            wallet: {
                publicKey,
                balance: balance / LAMPORTS_PER_SOL,
            },
        });
    } catch (error) {
        console.error("Error fetching wallet:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch wallet info" }, { status: 500 });
    }
}
