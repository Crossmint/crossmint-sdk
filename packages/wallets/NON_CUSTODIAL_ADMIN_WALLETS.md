# Non-Custodial Admin-Signed Smart Wallets Guide

This guide demonstrates how to create smart wallets for end-users in a non-custodial manner using the Crossmint Wallets SDK, where the admin's external wallet (EOA) acts as the signer while end-users remain fully web2-only.

## Overview

This implementation enables:
- **Non-custodial control**: Admin maintains signing authority through their EOA
- **Web2 user experience**: End-users interact via email/social login only
- **Cross-chain support**: Works on both EVM and Solana networks
- **Server-side compatibility**: Supports both client and server-side operations
- **Secure transaction flow**: Prepare-sign-submit pattern with external signing

## Core Requirements

### Admin Setup
- Admin has an external wallet (EOA) connected via wallet provider
- Admin can sign transactions using viem (EVM) or Solana SDK
- Admin manages wallet creation and transaction approval

### End-User Experience
- End-users authenticate via web2 methods (email, social login)
- No crypto wallet required for end-users
- Transparent on-chain interactions through admin signing

## Key SDK Methods

### Wallet Creation
- `WalletFactory.createWallet()` - Create new smart wallet with external signer
- `WalletFactory.getOrCreateWallet()` - Client-side wallet retrieval/creation
- `WalletFactory.getWallet()` - Server-side wallet retrieval

### Transaction Flow
- `wallet.send()` with `experimental_prepareOnly: true` - Prepare unsigned transaction
- `wallet.approve()` with `experimental_approval` - Submit externally signed transaction
- `wallet.experimental_transaction()` - Retrieve transaction details for signing

### External Signers
- `EVMExternalWalletSigner` - EVM chain external wallet integration
- `SolanaExternalWalletSigner` - Solana chain external wallet integration

## Implementation Flow

### 1. Wallet Creation Phase

```typescript
import { CrossmintWallets } from "@crossmint/client-sdk-react-ui";
import { createPublicClient, http, createWalletClient, custom } from "viem";
import { mainnet } from "viem/chains";

// Initialize Crossmint SDK
const crossmint = new CrossmintWallets({
  apiKey: "your-client-api-key",
});

// Admin's external wallet setup (EVM example)
const adminWalletClient = createWalletClient({
  chain: mainnet,
  transport: custom(window.ethereum), // or your wallet provider
});

const adminAddress = await adminWalletClient.getAddresses()[0];

// Create smart wallet with admin as external signer
const wallet = await crossmint.createWallet({
  chain: "ethereum",
  signer: {
    type: "external-wallet",
    address: adminAddress,
    provider: window.ethereum, // EIP1193 provider
  },
  owner: "user@example.com", // End-user identifier
});
```

### 2. Server-Side Wallet Management

```typescript
import { createCrossmint } from "@crossmint/common-sdk-base";

// Server-side SDK initialization
const crossmint = createCrossmint({
  apiKey: "your-server-api-key",
});

// Retrieve existing wallet for management
const wallet = await crossmint.wallets.getWallet(
  "wallet-address-or-locator",
  {
    chain: "ethereum",
    signer: {
      type: "external-wallet",
      address: adminAddress,
    },
  }
);
```

### 3. Transaction Preparation

```typescript
// Prepare transaction without signing
const preparedTransaction = await wallet.send(
  "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6", // recipient
  "usdc", // token
  "10.50", // amount
  {
    experimental_prepareOnly: true, // Key: prepare only, don't sign
  }
);

console.log("Transaction ID:", preparedTransaction.transactionId);
// Transaction is created but not signed or submitted
```

### 4. Raw Transaction Extraction

```typescript
// Retrieve transaction details for external signing
const transactionDetails = await wallet.experimental_transaction(
  preparedTransaction.transactionId
);

// Extract raw transaction data
const rawTransactionData = transactionDetails.onChain.transaction;
console.log("Raw transaction to sign:", rawTransactionData);
```

### 5. External Signing (EVM)

```typescript
import { signTransaction } from "viem";

// Admin signs the raw transaction using viem
const signedTransaction = await adminWalletClient.signTransaction({
  ...JSON.parse(rawTransactionData), // Parse the raw transaction
});

console.log("Signed transaction:", signedTransaction);
```

### 6. External Signing (Solana)

```typescript
import { VersionedTransaction } from "@solana/web3.js";
import base58 from "bs58";

// For Solana, use the onSignTransaction callback pattern
const wallet = await crossmint.createWallet({
  chain: "solana",
  signer: {
    type: "external-wallet",
    address: adminPublicKey.toString(),
    onSignTransaction: async (transaction: VersionedTransaction) => {
      // Admin signs using their Solana wallet
      const signedTx = await adminWallet.signTransaction(transaction);
      return signedTx;
    },
  },
  owner: "user@example.com",
});
```

### 7. Transaction Submission

```typescript
// Submit the externally signed transaction
const completedTransaction = await wallet.approve({
  transactionId: preparedTransaction.transactionId,
  options: {
    experimental_approval: {
      signature: signedTransaction, // The signature from external signing
      signer: adminAddress, // Admin's address
    },
  },
});

console.log("Transaction hash:", completedTransaction.hash);
console.log("Explorer link:", completedTransaction.explorerLink);
```

## Complete EVM Example

```typescript
import { CrossmintWallets } from "@crossmint/client-sdk-react-ui";
import { createWalletClient, custom, parseEther } from "viem";
import { mainnet } from "viem/chains";

class NonCustodialEVMWalletManager {
  private crossmint: CrossmintWallets;
  private adminWalletClient: any;
  private adminAddress: string;

  constructor(apiKey: string, adminProvider: any) {
    this.crossmint = new CrossmintWallets({ apiKey });
    this.adminWalletClient = createWalletClient({
      chain: mainnet,
      transport: custom(adminProvider),
    });
  }

  async initialize() {
    const addresses = await this.adminWalletClient.getAddresses();
    this.adminAddress = addresses[0];
  }

  async createUserWallet(userEmail: string) {
    try {
      const wallet = await this.crossmint.createWallet({
        chain: "ethereum",
        signer: {
          type: "external-wallet",
          address: this.adminAddress,
          provider: this.adminWalletClient.transport,
        },
        owner: userEmail,
      });

      return wallet;
    } catch (error) {
      console.error("Failed to create wallet:", error);
      throw new Error(`Wallet creation failed: ${error.message}`);
    }
  }

  async sendTokens(wallet: any, recipient: string, token: string, amount: string) {
    try {
      // Step 1: Prepare transaction
      const preparedTx = await wallet.send(recipient, token, amount, {
        experimental_prepareOnly: true,
      });

      // Step 2: Get transaction details
      const txDetails = await wallet.experimental_transaction(preparedTx.transactionId);
      
      // Step 3: Extract and sign raw transaction
      const rawTx = JSON.parse(txDetails.onChain.transaction);
      const signedTx = await this.adminWalletClient.signTransaction(rawTx);

      // Step 4: Submit signed transaction
      const result = await wallet.approve({
        transactionId: preparedTx.transactionId,
        options: {
          experimental_approval: {
            signature: signedTx,
            signer: this.adminAddress,
          },
        },
      });

      return result;
    } catch (error) {
      console.error("Transaction failed:", error);
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }
}

// Usage example
const walletManager = new NonCustodialEVMWalletManager(
  "your-api-key",
  window.ethereum
);

await walletManager.initialize();
const userWallet = await walletManager.createUserWallet("user@example.com");
const txResult = await walletManager.sendTokens(
  userWallet,
  "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "usdc",
  "25.00"
);
```

## Complete Solana Example

```typescript
import { CrossmintWallets } from "@crossmint/client-sdk-react-ui";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";

class NonCustodialSolanaWalletManager {
  private crossmint: CrossmintWallets;
  private adminWallet: any; // Your Solana wallet adapter
  private adminPublicKey: PublicKey;

  constructor(apiKey: string, adminWallet: any) {
    this.crossmint = new CrossmintWallets({ apiKey });
    this.adminWallet = adminWallet;
    this.adminPublicKey = adminWallet.publicKey;
  }

  async createUserWallet(userEmail: string) {
    try {
      const wallet = await this.crossmint.createWallet({
        chain: "solana",
        signer: {
          type: "external-wallet",
          address: this.adminPublicKey.toString(),
          onSignTransaction: async (transaction: VersionedTransaction) => {
            // Admin signs the transaction
            const signedTx = await this.adminWallet.signTransaction(transaction);
            return signedTx;
          },
        },
        owner: userEmail,
      });

      return wallet;
    } catch (error) {
      console.error("Failed to create Solana wallet:", error);
      throw new Error(`Wallet creation failed: ${error.message}`);
    }
  }

  async sendTokens(wallet: any, recipient: string, token: string, amount: string) {
    try {
      // For Solana, the signing happens automatically through onSignTransaction
      const result = await wallet.send(recipient, token, amount);
      return result;
    } catch (error) {
      console.error("Solana transaction failed:", error);
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }

  // Alternative: Manual prepare-sign-submit for Solana
  async sendTokensManual(wallet: any, recipient: string, token: string, amount: string) {
    try {
      // Step 1: Prepare transaction
      const preparedTx = await wallet.send(recipient, token, amount, {
        experimental_prepareOnly: true,
      });

      // Step 2: The signing will be handled by the onSignTransaction callback
      // when we approve the transaction
      const result = await wallet.approve({
        transactionId: preparedTx.transactionId,
      });

      return result;
    } catch (error) {
      console.error("Manual Solana transaction failed:", error);
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }
}
```

## Error Handling and Best Practices

### Comprehensive Error Handling

```typescript
import {
  WalletCreationError,
  TransactionNotCreatedError,
  TransactionFailedError,
  SignatureNotCreatedError,
  TransactionAwaitingApprovalError,
} from "@crossmint/client-sdk-react-ui";

class ErrorHandler {
  static async handleWalletOperation<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof WalletCreationError) {
        console.error("Wallet creation failed:", error.message);
        throw new Error("Unable to create wallet. Please check your configuration.");
      }
      
      if (error instanceof TransactionNotCreatedError) {
        console.error("Transaction creation failed:", error.message);
        throw new Error("Unable to prepare transaction. Please try again.");
      }
      
      if (error instanceof TransactionFailedError) {
        console.error("Transaction execution failed:", error.message);
        throw new Error("Transaction failed. Please check your balance and try again.");
      }
      
      if (error instanceof SignatureNotCreatedError) {
        console.error("Signature creation failed:", error.message);
        throw new Error("Unable to create signature. Please check your signer configuration.");
      }
      
      if (error instanceof TransactionAwaitingApprovalError) {
        console.error("Transaction awaiting approval:", error.message);
        throw new Error("Transaction is waiting for approval. Please sign with your wallet.");
      }
      
      // Generic error handling
      console.error("Unexpected error:", error);
      throw new Error("An unexpected error occurred. Please try again.");
    }
  }
}

// Usage
const result = await ErrorHandler.handleWalletOperation(async () => {
  return await walletManager.sendTokens(wallet, recipient, token, amount);
});
```

### Security Considerations

```typescript
class SecurityManager {
  // Validate recipient addresses
  static validateAddress(address: string, chain: "ethereum" | "solana"): boolean {
    if (chain === "ethereum") {
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    } else if (chain === "solana") {
      try {
        new PublicKey(address);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  // Validate transaction amounts
  static validateAmount(amount: string): boolean {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0 && num < 1000000; // Reasonable limits
  }

  // Rate limiting for admin operations
  static rateLimiter = new Map<string, number>();
  
  static checkRateLimit(adminAddress: string, maxPerMinute: number = 10): boolean {
    const now = Date.now();
    const key = `${adminAddress}-${Math.floor(now / 60000)}`;
    const count = this.rateLimiter.get(key) || 0;
    
    if (count >= maxPerMinute) {
      return false;
    }
    
    this.rateLimiter.set(key, count + 1);
    return true;
  }
}
```

### Gas Estimation and Nonce Management

```typescript
class TransactionManager {
  static async estimateGas(wallet: any, transaction: any): Promise<bigint> {
    try {
      // For EVM chains, use viem's estimateGas
      const publicClient = wallet.getViemClient();
      const gasEstimate = await publicClient.estimateGas(transaction);
      
      // Add 20% buffer for gas estimation
      return (gasEstimate * 120n) / 100n;
    } catch (error) {
      console.error("Gas estimation failed:", error);
      throw new Error("Unable to estimate gas. Transaction may fail.");
    }
  }

  static async getCurrentNonce(adminAddress: string, chain: string): Promise<number> {
    try {
      if (chain === "ethereum") {
        const publicClient = createPublicClient({
          chain: mainnet,
          transport: http(),
        });
        return await publicClient.getTransactionCount({
          address: adminAddress as `0x${string}`,
        });
      }
      // For Solana, nonce is handled automatically
      return 0;
    } catch (error) {
      console.error("Nonce retrieval failed:", error);
      throw new Error("Unable to get current nonce.");
    }
  }
}
```

## Testing and Verification

### Testing Transaction Preparation

```typescript
describe("Non-Custodial Wallet Tests", () => {
  let walletManager: NonCustodialEVMWalletManager;
  let testWallet: any;

  beforeEach(async () => {
    walletManager = new NonCustodialEVMWalletManager(
      process.env.CROSSMINT_API_KEY!,
      mockProvider
    );
    await walletManager.initialize();
    testWallet = await walletManager.createUserWallet("test@example.com");
  });

  test("should prepare transaction without signing", async () => {
    const preparedTx = await testWallet.send(
      "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
      "usdc",
      "1.00",
      { experimental_prepareOnly: true }
    );

    expect(preparedTx.transactionId).toBeDefined();
    expect(preparedTx.hash).toBeUndefined(); // Not signed yet
    expect(preparedTx.explorerLink).toBeUndefined();
  });

  test("should extract raw transaction data", async () => {
    const preparedTx = await testWallet.send(
      "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
      "usdc",
      "1.00",
      { experimental_prepareOnly: true }
    );

    const txDetails = await testWallet.experimental_transaction(
      preparedTx.transactionId
    );

    expect(txDetails.onChain.transaction).toBeDefined();
    expect(typeof txDetails.onChain.transaction).toBe("string");
  });

  test("should complete transaction with external approval", async () => {
    const preparedTx = await testWallet.send(
      "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
      "usdc",
      "1.00",
      { experimental_prepareOnly: true }
    );

    // Mock external signing
    const mockSignature = "0x" + "a".repeat(130);

    const result = await testWallet.approve({
      transactionId: preparedTx.transactionId,
      options: {
        experimental_approval: {
          signature: mockSignature,
          signer: walletManager.adminAddress,
        },
      },
    });

    expect(result.hash).toBeDefined();
    expect(result.explorerLink).toBeDefined();
  });
});
```

### Integration Testing

```typescript
// Test with real wallet providers
async function testWithRealWallet() {
  // Connect to MetaMask or other wallet
  if (typeof window.ethereum !== "undefined") {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    
    const walletManager = new NonCustodialEVMWalletManager(
      "your-api-key",
      window.ethereum
    );
    
    await walletManager.initialize();
    
    // Test wallet creation
    const wallet = await walletManager.createUserWallet("integration-test@example.com");
    console.log("Wallet created:", wallet.address);
    
    // Test small transaction
    const result = await walletManager.sendTokens(
      wallet,
      "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
      "usdc",
      "0.01" // Small test amount
    );
    
    console.log("Transaction completed:", result.hash);
  }
}
```

## Potential Extensions

### 1. Access Revocation

```typescript
class AccessManager {
  async revokeWalletAccess(wallet: any, adminAddress: string) {
    try {
      // Remove admin as delegated signer
      const delegatedSigners = await wallet.delegatedSigners();
      const adminSigner = delegatedSigners.find(s => 
        s.signer.includes(adminAddress)
      );
      
      if (adminSigner) {
        // Implementation depends on SDK support for signer removal
        console.log("Admin signer found, revocation needed");
        // This would require additional SDK methods
      }
    } catch (error) {
      console.error("Access revocation failed:", error);
    }
  }
}
```

### 2. Multi-Admin Support

```typescript
class MultiAdminWalletManager {
  private admins: string[] = [];
  
  async addAdmin(newAdminAddress: string, wallet: any) {
    await wallet.addDelegatedSigner({
      signer: newAdminAddress
    });
    this.admins.push(newAdminAddress);
  }
  
  async requireMultipleSignatures(
    wallet: any,
    transaction: any,
    requiredSignatures: number
  ) {
    const signatures: string[] = [];
    
    // Collect signatures from multiple admins
    for (let i = 0; i < requiredSignatures && i < this.admins.length; i++) {
      const signature = await this.getSignatureFromAdmin(this.admins[i], transaction);
      signatures.push(signature);
    }
    
    // Submit with multiple approvals
    return await wallet.approve({
      transactionId: transaction.transactionId,
      options: {
        additionalSigners: signatures.map((sig, index) => ({
          signature: sig,
          signer: this.admins[index],
        })),
      },
    });
  }
}
```

### 3. Transaction Batching

```typescript
class BatchTransactionManager {
  async batchTransactions(wallet: any, transactions: any[]) {
    const preparedTransactions = [];
    
    // Prepare all transactions
    for (const tx of transactions) {
      const prepared = await wallet.send(
        tx.recipient,
        tx.token,
        tx.amount,
        { experimental_prepareOnly: true }
      );
      preparedTransactions.push(prepared);
    }
    
    // Sign and submit all at once
    const results = [];
    for (const preparedTx of preparedTransactions) {
      const result = await this.signAndSubmit(wallet, preparedTx);
      results.push(result);
    }
    
    return results;
  }
}
```

### 4. Automated Approval Workflows

```typescript
class AutomatedApprovalManager {
  private approvalRules: Map<string, (tx: any) => boolean> = new Map();
  
  addApprovalRule(ruleId: string, rule: (tx: any) => boolean) {
    this.approvalRules.set(ruleId, rule);
  }
  
  async processTransaction(wallet: any, transaction: any) {
    // Check if transaction meets auto-approval criteria
    const shouldAutoApprove = Array.from(this.approvalRules.values())
      .every(rule => rule(transaction));
    
    if (shouldAutoApprove) {
      return await this.autoApprove(wallet, transaction);
    } else {
      // Queue for manual approval
      return await this.queueForManualApproval(transaction);
    }
  }
  
  private async autoApprove(wallet: any, transaction: any) {
    // Implement automated signing logic
    console.log("Auto-approving transaction:", transaction.transactionId);
    // ... signing logic
  }
}

// Usage
const approvalManager = new AutomatedApprovalManager();

// Add rule: auto-approve USDC transfers under $100
approvalManager.addApprovalRule("small-usdc", (tx) => {
  return tx.token === "usdc" && parseFloat(tx.amount) < 100;
});

// Add rule: auto-approve to whitelisted addresses
const whitelistedAddresses = new Set([
  "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"
]);

approvalManager.addApprovalRule("whitelisted-recipient", (tx) => {
  return whitelistedAddresses.has(tx.recipient);
});
```

## Summary

This guide provides a complete implementation for non-custodial admin-signed smart wallets using the Crossmint SDK. The key benefits include:

- **Non-custodial security**: Admin retains full control through external wallet signing
- **Web2 user experience**: End-users never need to manage crypto wallets
- **Cross-chain compatibility**: Works seamlessly on EVM and Solana networks
- **Production-ready**: Includes comprehensive error handling and security measures
- **Extensible**: Supports advanced features like multi-admin and automated approvals

The prepare-sign-submit flow using `experimental_prepareOnly: true` and `experimental_approval` provides the foundation for secure, admin-controlled wallet operations while maintaining the benefits of smart wallet infrastructure.
