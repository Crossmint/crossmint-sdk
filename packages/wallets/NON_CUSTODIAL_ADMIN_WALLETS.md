# Non-Custodial Admin-Signed Smart Wallets Quickstart

Create smart wallets for your end-users where your admin's external wallet (EOA) acts as the signer, enabling a fully web2 user experience while maintaining non-custodial control.

<Warning>
This guide uses experimental SDK features (`experimental_prepareOnly`, `experimental_approval`) that may change in future versions. Always test thoroughly in development environments before production deployment.
</Warning>

## Prerequisites

Before starting, ensure you have:

- **Crossmint API Keys**: Both client-side and server-side API keys from your [Crossmint Console](https://console.crossmint.com)
- **Admin Wallet**: An external wallet (MetaMask, Phantom, etc.) with sufficient funds for gas fees
- **Server Environment**: Node.js backend to handle all wallet operations and signing
- **Authentication System**: User authentication (we recommend [Crossmint Auth](https://docs.crossmint.com/authentication) for seamless integration)

<Note>
**Critical Security Requirement**: All wallet creation, transaction preparation, signing, and approval operations MUST happen server-side. Never expose private keys or perform signing operations on the client-side.
</Note>

## Overview

This implementation enables:
- **🔐 Non-custodial control**: Admin maintains signing authority through their EOA
- **🌐 Web2 user experience**: End-users interact via email/social login only  
- **⛓️ Cross-chain support**: Works on both EVM and Solana networks
- **🛡️ Server-side security**: All sensitive operations happen on your backend
- **🔄 Prepare-sign-submit flow**: Secure transaction pattern with external signing

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App    │───▶│  Your Backend   │───▶│  Admin Wallet   │
│                 │    │                 │    │                 │
│ • User login    │    │ • Wallet ops    │    │ • Transaction   │
│ • UI/UX only    │    │ • Signing       │    │   signing       │
│ • No crypto     │    │ • Security      │    │ • EOA control   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Key SDK Methods

### Server-Side Wallet Operations
- `CrossmintWallets.createWallet()` - Create smart wallet with admin as external signer
- `CrossmintWallets.getWallet()` - Retrieve existing wallet for operations
- `wallet.send()` with `experimental_prepareOnly: true` - Prepare unsigned transactions
- `wallet.approve()` with `experimental_approval` - Submit externally signed transactions

### Authentication & Security
- `CrossmintAuthServer.getSession()` - Validate user sessions server-side
- `CrossmintAuthServer.verifyToken()` - Verify JWT tokens from client requests

### External Signer Configuration
- **EVM**: `{ type: "external-wallet", address: adminAddress, viemAccount: account }`
- **Solana**: `{ type: "external-wallet", address: adminAddress, onSignTransaction: callback }`

## Implementation Guide

### Step 1: Server-Side Setup

First, set up your backend with the necessary dependencies and environment variables:

```bash
# Install required packages
npm install @crossmint/server-sdk @crossmint/common-sdk-base viem @solana/web3.js
```

```typescript
// server/config.ts
import { CrossmintWallets } from "@crossmint/server-sdk";
import { createWalletClient, http } from "viem";
import { mainnet } from "viem/chains";

// Environment variables (never expose these client-side)
const CROSSMINT_SERVER_API_KEY = process.env.CROSSMINT_SERVER_API_KEY!;
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY!; // Admin's EOA private key

// Initialize server-side SDK
export const crossmint = new CrossmintWallets({
  apiKey: CROSSMINT_SERVER_API_KEY,
});

// Admin wallet client for signing (EVM)
export const adminWalletClient = createWalletClient({
  chain: mainnet,
  transport: http(),
  account: privateKeyToAccount(ADMIN_PRIVATE_KEY as `0x${string}`),
});
```

### Step 2: User Authentication

Set up user authentication using Crossmint Auth or your preferred method:

```typescript
// server/auth.ts
import { CrossmintAuthServer } from "@crossmint/server-sdk";

const authServer = new CrossmintAuthServer({
  apiKey: CROSSMINT_SERVER_API_KEY,
});

export async function validateUserSession(authToken: string) {
  try {
    const session = await authServer.getSession(authToken);
    return {
      userId: session.user.id,
      email: session.user.email,
      isValid: true,
    };
  } catch (error) {
    return { isValid: false };
  }
}
```

### Step 3: Wallet Management Service

Create a service to handle all wallet operations server-side:

```typescript
// server/wallet-service.ts
import { crossmint, adminWalletClient } from "./config";
import { validateUserSession } from "./auth";

export class WalletService {
  // Create smart wallet for user (server-side only)
  async createUserWallet(authToken: string, userEmail: string) {
    const session = await validateUserSession(authToken);
    if (!session.isValid) {
      throw new Error("Invalid authentication");
    }

    const adminAddress = adminWalletClient.account.address;

    const wallet = await crossmint.createWallet({
      chain: "ethereum",
      signer: {
        type: "external-wallet",
        address: adminAddress,
        viemAccount: adminWalletClient.account, // EVM signer config
      },
      owner: userEmail,
    });

    return {
      address: wallet.address,
      chain: wallet.chain,
      owner: userEmail,
    };
  }

  // Send tokens (complete server-side flow)
  async sendTokens(
    authToken: string,
    walletAddress: string,
    recipient: string,
    token: string,
    amount: string
  ) {
    const session = await validateUserSession(authToken);
    if (!session.isValid) {
      throw new Error("Invalid authentication");
    }

    // Get wallet instance
    const wallet = await crossmint.getWallet(walletAddress, {
      chain: "ethereum",
      signer: {
        type: "external-wallet",
        address: adminWalletClient.account.address,
        viemAccount: adminWalletClient.account,
      },
    });

    // Step 1: Prepare transaction (unsigned)
    const preparedTx = await wallet.send(recipient, token, amount, {
      experimental_prepareOnly: true,
    });

    // Step 2: Get raw transaction data
    const txDetails = await wallet.experimental_transaction(preparedTx.transactionId);
    const rawTx = JSON.parse(txDetails.onChain.transaction);

    // Step 3: Admin signs transaction server-side
    const signedTx = await adminWalletClient.signTransaction(rawTx);

    // Step 4: Submit signed transaction
    const result = await wallet.approve({
      transactionId: preparedTx.transactionId,
      options: {
        experimental_approval: {
          signature: signedTx,
          signer: adminWalletClient.account.address,
        },
      },
    });

    return {
      hash: result.hash,
      explorerLink: result.explorerLink,
      status: "completed",
    };
  }
}

export const walletService = new WalletService();
```

### Step 4: API Endpoints

Create secure API endpoints that clients can call:

```typescript
// server/api/wallet-routes.ts
import express from "express";
import { walletService } from "../wallet-service";

const router = express.Router();

// Create wallet for authenticated user
router.post("/create-wallet", async (req, res) => {
  try {
    const { authToken, email } = req.body;
    
    if (!authToken || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const wallet = await walletService.createUserWallet(authToken, email);
    
    res.json({
      success: true,
      wallet: {
        address: wallet.address,
        chain: wallet.chain,
      },
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      success: false,
    });
  }
});

// Send tokens on behalf of user
router.post("/send-tokens", async (req, res) => {
  try {
    const { authToken, walletAddress, recipient, token, amount } = req.body;
    
    // Validate required fields
    if (!authToken || !walletAddress || !recipient || !token || !amount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate recipient address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      return res.status(400).json({ error: "Invalid recipient address" });
    }

    // Validate amount
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const result = await walletService.sendTokens(
      authToken,
      walletAddress,
      recipient,
      token,
      amount
    );
    
    res.json({
      success: true,
      transaction: result,
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      success: false,
    });
  }
});

export default router;
```

### Step 5: Client-Side Integration

Simple client-side code that calls your secure backend:

```typescript
// client/wallet-client.ts
export class WalletClient {
  private baseUrl: string;
  private authToken: string;

  constructor(baseUrl: string, authToken: string) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
  }

  async createWallet(email: string) {
    const response = await fetch(`${this.baseUrl}/api/create-wallet`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        authToken: this.authToken,
        email,
      }),
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error);
    }

    return data.wallet;
  }

  async sendTokens(walletAddress: string, recipient: string, token: string, amount: string) {
    const response = await fetch(`${this.baseUrl}/api/send-tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        authToken: this.authToken,
        walletAddress,
        recipient,
        token,
        amount,
      }),
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error);
    }

    return data.transaction;
  }
}

// Usage in React component
function WalletComponent({ userEmail, authToken }) {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const walletClient = new WalletClient("https://your-api.com", authToken);

  const handleCreateWallet = async () => {
    setLoading(true);
    try {
      const newWallet = await walletClient.createWallet(userEmail);
      setWallet(newWallet);
    } catch (error) {
      console.error("Failed to create wallet:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTokens = async (recipient: string, amount: string) => {
    if (!wallet) return;
    
    setLoading(true);
    try {
      const result = await walletClient.sendTokens(
        wallet.address,
        recipient,
        "usdc",
        amount
      );
      console.log("Transaction completed:", result.hash);
    } catch (error) {
      console.error("Transaction failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {!wallet ? (
        <button onClick={handleCreateWallet} disabled={loading}>
          {loading ? "Creating..." : "Create Wallet"}
        </button>
      ) : (
        <div>
          <p>Wallet: {wallet.address}</p>
          <button 
            onClick={() => handleSendTokens("0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6", "10")}
            disabled={loading}
          >
            {loading ? "Sending..." : "Send 10 USDC"}
          </button>
        </div>
      )}
    </div>
  );
}
```

## Solana Implementation

For Solana chains, the implementation follows a similar pattern with chain-specific configurations:

```typescript
// server/solana-wallet-service.ts
import { CrossmintWallets } from "@crossmint/server-sdk";
import { Connection, Keypair, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const ADMIN_SOLANA_PRIVATE_KEY = process.env.ADMIN_SOLANA_PRIVATE_KEY!; // Base58 encoded

export class SolanaWalletService {
  private crossmint: CrossmintWallets;
  private adminKeypair: Keypair;
  private connection: Connection;

  constructor() {
    this.crossmint = new CrossmintWallets({
      apiKey: process.env.CROSSMINT_SERVER_API_KEY!,
    });
    
    this.adminKeypair = Keypair.fromSecretKey(
      bs58.decode(ADMIN_SOLANA_PRIVATE_KEY)
    );
    
    this.connection = new Connection(SOLANA_RPC_URL);
  }

  async createUserWallet(authToken: string, userEmail: string) {
    const session = await validateUserSession(authToken);
    if (!session.isValid) {
      throw new Error("Invalid authentication");
    }

    const wallet = await this.crossmint.createWallet({
      chain: "solana",
      signer: {
        type: "external-wallet",
        address: this.adminKeypair.publicKey.toString(),
        onSignTransaction: async (transaction: VersionedTransaction) => {
          // Admin signs transaction server-side
          transaction.sign([this.adminKeypair]);
          return transaction;
        },
      },
      owner: userEmail,
    });

    return {
      address: wallet.address,
      chain: wallet.chain,
      owner: userEmail,
    };
  }

  async sendTokens(
    authToken: string,
    walletAddress: string,
    recipient: string,
    token: string,
    amount: string
  ) {
    const session = await validateUserSession(authToken);
    if (!session.isValid) {
      throw new Error("Invalid authentication");
    }

    const wallet = await this.crossmint.getWallet(walletAddress, {
      chain: "solana",
      signer: {
        type: "external-wallet",
        address: this.adminKeypair.publicKey.toString(),
        onSignTransaction: async (transaction: VersionedTransaction) => {
          transaction.sign([this.adminKeypair]);
          return transaction;
        },
      },
    });

    // For Solana, signing happens automatically via onSignTransaction callback
    const result = await wallet.send(recipient, token, amount);

    return {
      hash: result.hash,
      explorerLink: result.explorerLink,
      status: "completed",
    };
  }

  // Alternative: Manual prepare-sign-submit flow
  async sendTokensManual(
    authToken: string,
    walletAddress: string,
    recipient: string,
    token: string,
    amount: string
  ) {
    const session = await validateUserSession(authToken);
    if (!session.isValid) {
      throw new Error("Invalid authentication");
    }

    const wallet = await this.crossmint.getWallet(walletAddress, {
      chain: "solana",
      signer: {
        type: "external-wallet",
        address: this.adminKeypair.publicKey.toString(),
        onSignTransaction: async (transaction: VersionedTransaction) => {
          transaction.sign([this.adminKeypair]);
          return transaction;
        },
      },
    });

    // Step 1: Prepare transaction
    const preparedTx = await wallet.send(recipient, token, amount, {
      experimental_prepareOnly: true,
    });

    // Step 2: Approve (signing handled by callback)
    const result = await wallet.approve({
      transactionId: preparedTx.transactionId,
    });

    return {
      hash: result.hash,
      explorerLink: result.explorerLink,
      status: "completed",
    };
  }
}
```

## Error Handling & Security

### Comprehensive Error Handling

```typescript
// server/error-handler.ts
import {
  WalletCreationError,
  TransactionNotCreatedError,
  TransactionFailedError,
  SignatureNotCreatedError,
  TransactionAwaitingApprovalError,
} from "@crossmint/server-sdk";

export class WalletErrorHandler {
  static async handleOperation<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      // Log error for monitoring (use your preferred logging service)
      console.error("Wallet operation error:", {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });

      if (error instanceof WalletCreationError) {
        throw new Error("Unable to create wallet. Please try again later.");
      }
      
      if (error instanceof TransactionNotCreatedError) {
        throw new Error("Transaction preparation failed. Please check your inputs.");
      }
      
      if (error instanceof TransactionFailedError) {
        throw new Error("Transaction failed. Please check balances and try again.");
      }
      
      if (error instanceof SignatureNotCreatedError) {
        throw new Error("Transaction signing failed. Please contact support.");
      }
      
      if (error instanceof TransactionAwaitingApprovalError) {
        throw new Error("Transaction is pending approval. Please wait.");
      }
      
      // Generic error for unknown issues
      throw new Error("Service temporarily unavailable. Please try again later.");
    }
  }
}
```

### Security Best Practices

<Warning>
**Critical Security Requirements:**
- Never expose admin private keys client-side
- Always validate user authentication server-side
- Implement rate limiting on all wallet operations
- Use HTTPS for all API communications
- Store private keys in secure environment variables or key management systems
</Warning>

```typescript
// server/security.ts
import { PublicKey } from "@solana/web3.js";
import rateLimit from "express-rate-limit";

export class SecurityManager {
  // Validate addresses by chain
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

  // Validate transaction amounts with reasonable limits
  static validateAmount(amount: string, token: string): boolean {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return false;
    
    // Set reasonable limits per token type
    const limits = {
      usdc: 100000, // $100k max
      eth: 50,      // 50 ETH max
      sol: 1000,    // 1000 SOL max
      default: 10000,
    };
    
    const maxAmount = limits[token.toLowerCase()] || limits.default;
    return num <= maxAmount;
  }

  // Validate user permissions
  static async validateUserPermissions(
    userId: string, 
    walletAddress: string
  ): Promise<boolean> {
    // Implement your user-wallet ownership validation
    // This could check a database or other authorization system
    return true; // Placeholder
  }
}

// Rate limiting middleware
export const walletRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per IP
  message: "Too many wallet requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

export const transactionRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute  
  max: 5, // 5 transactions per minute per IP
  message: "Too many transaction requests, please try again later",
});
```

### Transaction Management

```typescript
// server/transaction-manager.ts
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

export class TransactionManager {
  // Gas estimation with safety buffer
  static async estimateGas(
    adminAddress: string,
    transaction: any,
    chain: string
  ): Promise<bigint> {
    try {
      if (chain === "ethereum") {
        const publicClient = createPublicClient({
          chain: mainnet,
          transport: http(),
        });
        
        const gasEstimate = await publicClient.estimateGas({
          account: adminAddress as `0x${string}`,
          ...transaction,
        });
        
        // Add 20% buffer for gas estimation
        return (gasEstimate * 120n) / 100n;
      }
      
      // Solana gas is handled automatically
      return 0n;
    } catch (error) {
      console.error("Gas estimation failed:", error);
      throw new Error("Unable to estimate transaction cost");
    }
  }

  // Check admin wallet balance before transactions
  static async checkAdminBalance(
    adminAddress: string,
    chain: string,
    requiredAmount?: bigint
  ): Promise<boolean> {
    try {
      if (chain === "ethereum") {
        const publicClient = createPublicClient({
          chain: mainnet,
          transport: http(),
        });
        
        const balance = await publicClient.getBalance({
          address: adminAddress as `0x${string}`,
        });
        
        // Ensure admin has enough ETH for gas
        const minBalance = requiredAmount || BigInt("100000000000000000"); // 0.1 ETH
        return balance >= minBalance;
      }
      
      return true; // Solana balance check would go here
    } catch (error) {
      console.error("Balance check failed:", error);
      return false;
    }
  }

  // Monitor transaction status
  static async waitForTransaction(
    txHash: string,
    chain: string,
    maxWaitTime: number = 300000 // 5 minutes
  ): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        if (chain === "ethereum") {
          const publicClient = createPublicClient({
            chain: mainnet,
            transport: http(),
          });
          
          const receipt = await publicClient.getTransactionReceipt({
            hash: txHash as `0x${string}`,
          });
          
          if (receipt) {
            return receipt.status === "success";
          }
        }
        
        // Wait 5 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        // Transaction might not be mined yet, continue waiting
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    throw new Error("Transaction confirmation timeout");
  }
}
```

## Testing & Verification

### Unit Testing

```typescript
// tests/wallet-service.test.ts
import { WalletService } from "../server/wallet-service";
import { jest } from "@jest/globals";

describe("WalletService", () => {
  let walletService: WalletService;
  let mockAuthToken: string;

  beforeEach(() => {
    walletService = new WalletService();
    mockAuthToken = "valid-auth-token";
    
    // Mock authentication validation
    jest.spyOn(require("../server/auth"), "validateUserSession")
      .mockResolvedValue({ isValid: true, userId: "test-user", email: "test@example.com" });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("should create wallet for authenticated user", async () => {
    const result = await walletService.createUserWallet(
      mockAuthToken,
      "test@example.com"
    );

    expect(result.address).toBeDefined();
    expect(result.chain).toBe("ethereum");
    expect(result.owner).toBe("test@example.com");
  });

  test("should reject wallet creation for invalid auth", async () => {
    jest.spyOn(require("../server/auth"), "validateUserSession")
      .mockResolvedValue({ isValid: false });

    await expect(
      walletService.createUserWallet("invalid-token", "test@example.com")
    ).rejects.toThrow("Invalid authentication");
  });

  test("should validate transaction inputs", async () => {
    await expect(
      walletService.sendTokens(
        mockAuthToken,
        "0x1234567890123456789012345678901234567890",
        "invalid-address", // Invalid recipient
        "usdc",
        "10"
      )
    ).rejects.toThrow();
  });
});
```

### Integration Testing

```typescript
// tests/integration.test.ts
import request from "supertest";
import app from "../server/app";

describe("Wallet API Integration", () => {
  const validAuthToken = process.env.TEST_AUTH_TOKEN;
  const testEmail = "integration-test@example.com";

  test("POST /api/create-wallet", async () => {
    const response = await request(app)
      .post("/api/create-wallet")
      .send({
        authToken: validAuthToken,
        email: testEmail,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.wallet.address).toBeDefined();
  });

  test("POST /api/send-tokens", async () => {
    // First create a wallet
    const walletResponse = await request(app)
      .post("/api/create-wallet")
      .send({
        authToken: validAuthToken,
        email: testEmail,
      });

    const walletAddress = walletResponse.body.wallet.address;

    // Then send tokens
    const response = await request(app)
      .post("/api/send-tokens")
      .send({
        authToken: validAuthToken,
        walletAddress,
        recipient: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
        token: "usdc",
        amount: "0.01", // Small test amount
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.transaction.hash).toBeDefined();
  });
});
```

### Manual Testing Checklist

Before deploying to production, verify:

**✅ Authentication Flow**
- [ ] User authentication works with your auth system
- [ ] Invalid tokens are properly rejected
- [ ] Session validation is working server-side

**✅ Wallet Operations**
- [ ] Wallet creation succeeds for valid users
- [ ] Wallet addresses are properly formatted
- [ ] Multiple wallets can be created for different users

**✅ Transaction Flow**
- [ ] Transaction preparation works without signing
- [ ] Raw transaction data is extractable
- [ ] Admin signing completes successfully
- [ ] Transaction approval submits correctly
- [ ] Transaction status is properly tracked

**✅ Security Measures**
- [ ] Private keys are never exposed client-side
- [ ] Rate limiting is working on all endpoints
- [ ] Input validation catches malformed data
- [ ] Error messages don't leak sensitive information

**✅ Error Handling**
- [ ] Network failures are handled gracefully
- [ ] Invalid inputs return appropriate errors
- [ ] Timeout scenarios are managed properly
- [ ] User-friendly error messages are returned

## Advanced Features

### 1. Multi-Admin Support

For enterprise use cases requiring multiple approvers:

```typescript
// server/multi-admin-service.ts
export class MultiAdminWalletService {
  private adminKeypairs: Map<string, any> = new Map();
  
  async addAdmin(adminId: string, privateKey: string, chain: string) {
    if (chain === "ethereum") {
      const account = privateKeyToAccount(privateKey as `0x${string}`);
      this.adminKeypairs.set(adminId, { account, chain });
    } else if (chain === "solana") {
      const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
      this.adminKeypairs.set(adminId, { keypair, chain });
    }
  }
  
  async requireMultipleApprovals(
    walletAddress: string,
    transaction: any,
    requiredApprovals: string[] // Array of admin IDs
  ) {
    const wallet = await this.crossmint.getWallet(walletAddress);
    
    // Prepare transaction once
    const preparedTx = await wallet.send(
      transaction.recipient,
      transaction.token,
      transaction.amount,
      { experimental_prepareOnly: true }
    );
    
    // Collect signatures from required admins
    const signatures = [];
    for (const adminId of requiredApprovals) {
      const admin = this.adminKeypairs.get(adminId);
      if (!admin) throw new Error(`Admin ${adminId} not found`);
      
      const signature = await this.signWithAdmin(preparedTx, admin);
      signatures.push({ signature, signer: adminId });
    }
    
    // Submit with multiple signatures
    return await wallet.approve({
      transactionId: preparedTx.transactionId,
      options: {
        experimental_approval: {
          signatures: signatures,
        },
      },
    });
  }
}
```

### 2. Automated Approval Rules

Implement business logic for automatic transaction approval:

```typescript
// server/approval-rules.ts
export class ApprovalRuleEngine {
  private rules: Map<string, (tx: any) => boolean> = new Map();
  
  addRule(ruleId: string, rule: (tx: any) => boolean) {
    this.rules.set(ruleId, rule);
  }
  
  async evaluateTransaction(transaction: any): Promise<boolean> {
    // All rules must pass for auto-approval
    return Array.from(this.rules.values()).every(rule => rule(transaction));
  }
}

// Usage in your wallet service
const approvalEngine = new ApprovalRuleEngine();

// Rule: Auto-approve small USDC transfers
approvalEngine.addRule("small-usdc", (tx) => {
  return tx.token.toLowerCase() === "usdc" && parseFloat(tx.amount) <= 100;
});

// Rule: Auto-approve to whitelisted addresses
const whitelist = new Set(["0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"]);
approvalEngine.addRule("whitelist", (tx) => {
  return whitelist.has(tx.recipient.toLowerCase());
});

// Rule: Business hours only
approvalEngine.addRule("business-hours", (tx) => {
  const hour = new Date().getHours();
  return hour >= 9 && hour <= 17; // 9 AM to 5 PM
});
```

### 3. Transaction Monitoring & Webhooks

Monitor transaction status and notify external systems:

```typescript
// server/monitoring.ts
export class TransactionMonitor {
  async monitorTransaction(txHash: string, chain: string, webhookUrl?: string) {
    const startTime = Date.now();
    const maxWaitTime = 300000; // 5 minutes
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const status = await this.checkTransactionStatus(txHash, chain);
        
        if (status.confirmed) {
          // Notify webhook if provided
          if (webhookUrl) {
            await this.sendWebhook(webhookUrl, {
              txHash,
              status: status.success ? "success" : "failed",
              timestamp: new Date().toISOString(),
            });
          }
          
          return status;
        }
        
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s
      } catch (error) {
        console.error("Transaction monitoring error:", error);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
    
    throw new Error("Transaction monitoring timeout");
  }
  
  private async sendWebhook(url: string, data: any) {
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error("Webhook delivery failed:", error);
    }
  }
}
```

## Production Deployment

### Environment Setup

```bash
# Required environment variables
CROSSMINT_SERVER_API_KEY=your_server_api_key
ADMIN_PRIVATE_KEY_EVM=0x...
ADMIN_PRIVATE_KEY_SOLANA=base58_encoded_key
DATABASE_URL=your_database_connection
REDIS_URL=your_redis_connection # For rate limiting
WEBHOOK_SECRET=your_webhook_secret
```

### Monitoring & Alerting

Set up monitoring for:
- **Transaction failures**: Alert when transactions fail repeatedly
- **Balance monitoring**: Alert when admin wallets run low on gas
- **Rate limit breaches**: Monitor for unusual activity patterns
- **API response times**: Ensure wallet operations complete quickly
- **Error rates**: Track and alert on increasing error rates

### Scaling Considerations

- **Database**: Store wallet metadata and transaction history
- **Caching**: Use Redis for rate limiting and session management
- **Load balancing**: Distribute API requests across multiple servers
- **Admin key rotation**: Implement secure key rotation procedures
- **Backup strategies**: Ensure admin keys are securely backed up

## Summary

This server-side implementation provides a secure, scalable solution for non-custodial admin-signed smart wallets:

🔐 **Security First**
- All sensitive operations happen server-side
- Private keys never exposed to clients
- Comprehensive input validation and rate limiting

🌐 **Web2 User Experience**
- End-users interact through simple API calls
- No crypto wallet management required
- Seamless integration with existing auth systems

⛓️ **Multi-Chain Support**
- Works on both EVM and Solana networks
- Consistent API across different chains
- Chain-specific optimizations included

🛡️ **Production Ready**
- Comprehensive error handling
- Transaction monitoring and webhooks
- Advanced features like multi-admin approval
- Automated approval rules for business logic

<Note>
Remember to thoroughly test all flows in development environments before production deployment. The experimental SDK features used in this guide may evolve, so always check the latest Crossmint SDK documentation for updates.
</Note>

## Next Steps

1. **Set up your development environment** with the required dependencies
2. **Configure your admin wallets** and secure private key storage
3. **Implement user authentication** using Crossmint Auth or your preferred system
4. **Test the complete flow** with small amounts on testnets
5. **Deploy to production** with proper monitoring and alerting
6. **Scale as needed** with additional features and optimizations

For additional support, consult the [Crossmint Documentation](https://docs.crossmint.com) or reach out to the Crossmint team.
