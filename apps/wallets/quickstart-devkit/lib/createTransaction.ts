import {
  TransactionMessage,
  PublicKey,
  VersionedTransaction,
  Connection,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const connection = new Connection(
  process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com",
  "confirmed"
);

export async function createSolTransferTransaction(
  from: string,
  to: string,
  amount: number
) {
  const fromPublicKey = new PublicKey(from);
  const toPublicKey = new PublicKey(to);
  const amountInBaseUnits = amount * LAMPORTS_PER_SOL;

  const instructions = [
    SystemProgram.transfer({
      fromPubkey: fromPublicKey,
      toPubkey: toPublicKey,
      lamports: amountInBaseUnits,
    }),
  ];

  const message = new TransactionMessage({
    instructions,
    recentBlockhash: "11111111111111111111111111111111",
    payerKey: fromPublicKey,
  }).compileToV0Message();

  return new VersionedTransaction(message);
}

export async function createTokenTransferTransaction(
  from: string,
  to: string,
  tokenMint: string,
  amount: number
) {
  // Convert addresses to PublicKeys
  const fromPublicKey = new PublicKey(from);
  const toPublicKey = new PublicKey(to);
  const tokenMintPublicKey = new PublicKey(tokenMint);
  const allowOffCurve = true;

  // Get associated token accounts for both addresses
  const senderTokenAccount = await getAssociatedTokenAddress(
    tokenMintPublicKey,
    fromPublicKey,
    allowOffCurve
  );
  const recipientTokenAccount = await getAssociatedTokenAddress(
    tokenMintPublicKey,
    toPublicKey,
    allowOffCurve
  );
  console.log("Sender token account:", senderTokenAccount);
  console.log("Recipient token account:", recipientTokenAccount);

  // Amount needs to be converted to base units (multiply by 10^6 for USDC)
  const amountInBaseUnits = amount * 1_000_000;

  // Create new transaction
  const instructions = [];
  const recipientAccountInfo = await connection.getAccountInfo(
    recipientTokenAccount
  );
  console.log("Recipient account info:", recipientAccountInfo);
  if (!recipientAccountInfo) {
    instructions.push(
      createAssociatedTokenAccountInstruction(
        fromPublicKey,
        recipientTokenAccount,
        toPublicKey,
        tokenMintPublicKey,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  // Add the transfer instruction
  instructions.push(
    createTransferInstruction(
      senderTokenAccount,
      recipientTokenAccount,
      fromPublicKey,
      amountInBaseUnits,
      [],
      TOKEN_PROGRAM_ID
    )
  );

  const message = new TransactionMessage({
    instructions,
    recentBlockhash: "11111111111111111111111111111111",
    payerKey: fromPublicKey,
  }).compileToV0Message();

  return new VersionedTransaction(message);
}
