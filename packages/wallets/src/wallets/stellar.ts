import { isValidStellarAddress, WithLoggerContext } from "@crossmint/common-sdk-base";
import type { Chain, StellarChain } from "../chains/chains";
import type {
    ApproveOptions,
    MigrateOptions,
    StellarTransactionInput,
    Transaction,
    TransactionInputOptions,
    TransactionResult,
    UpgradeOptions,
} from "./types";
import { Wallet } from "./wallet";
import { throwIfQuorumApiError, TransactionNotCreatedError } from "../utils/errors";
import type { CreateTransactionSuccessResponse } from "@/api";
import { walletsLogger } from "../logger";

const WALLET_LOCKED_STATUS_CODE = 409;

export class StellarWallet extends Wallet<StellarChain> {
    constructor(wallet: Wallet<StellarChain>) {
        super(
            {
                chain: wallet.chain,
                address: wallet.address,
                owner: wallet.owner,
                options: Wallet.getOptions(wallet),
                alias: wallet.alias,
                recovery: Wallet.getRecoverySigners(wallet),
                apiRecoveryServerSignerAddresses: Wallet.getApiRecoveryServerSignerAddresses(wallet),
                apiDelegatedServerSignerAddresses: Wallet.getApiDelegatedServerSignerAddresses(wallet),
                signer: wallet.signer,
                signers: Wallet.getInitialSigners(wallet),
            },
            Wallet.getApiClient(wallet)
        );
    }

    static from(wallet: Wallet<Chain>) {
        if (!isValidStellarAddress(wallet.address)) {
            throw new Error("Wallet is not a Stellar wallet");
        }

        return new StellarWallet(wallet as Wallet<StellarChain>);
    }

    /**
     * Send a raw Stellar transaction (serialized transaction or contract call).
     * @param params - The transaction parameters
     * @returns The transaction result
     */
    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "stellarWallet.sendTransaction",
        buildContext(thisArg: StellarWallet) {
            return { chain: thisArg.chain, address: thisArg.address };
        },
    })
    public async sendTransaction<T extends TransactionInputOptions | undefined = undefined>(
        params: StellarTransactionInput & { options?: T }
    ): Promise<TransactionResult<T>> {
        walletsLogger.info("stellarWallet.sendTransaction.start");

        await this.preAuthIfNeeded();
        const createdTransaction = await this.createTransaction(params);

        if (params.options?.prepareOnly) {
            walletsLogger.info("stellarWallet.sendTransaction.prepared", {
                transactionId: createdTransaction.id,
            });
            return {
                hash: undefined,
                explorerLink: undefined,
                transactionId: createdTransaction.id,
            } as TransactionResult<T>;
        }

        const options: ApproveOptions = {};

        const result = await this.approveTransactionAndWait(createdTransaction.id, options);
        walletsLogger.info("stellarWallet.sendTransaction.success", {
            transactionId: createdTransaction.id,
            hash: result.hash,
        });
        return result as TransactionResult<T>;
    }

    /**
     * Upgrade this Stellar smart wallet to the latest contract version.
     *
     * Stellar wallet upgrades are a two-phase on-chain process: first an `upgrade-wallet`
     * transaction swaps the contract bytecode (leaving the wallet temporarily locked),
     * then a `migrate-wallet` transaction transforms the signer storage layout and
     * unlocks the wallet. This method orchestrates both phases.
     *
     * Idempotent: if the wallet is already locked from a previous upgrade attempt,
     * the phase-1 call is skipped and only the migration is executed.
     *
     * @param options - Optional prepareOnly / signer override. When `prepareOnly` is
     *   true, returns a prepared transaction without approving it; the developer must
     *   then approve it and (if it was the phase-1 tx) call `migrate()` for phase 2.
     * @returns
     *   - When `prepareOnly` is true and the wallet is not already locked: the prepared
     *     phase-1 `upgrade-wallet` transaction.
     *   - When `prepareOnly` is true and the wallet is already locked (idempotent path):
     *     the prepared phase-2 `migrate-wallet` transaction.
     *   - Otherwise: the confirmed migrate transaction result.
     */
    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "stellarWallet.upgrade",
        buildContext(thisArg: StellarWallet) {
            return { chain: thisArg.chain, address: thisArg.address };
        },
    })
    public async upgrade<T extends UpgradeOptions | undefined = undefined>(options?: T): Promise<TransactionResult<T>> {
        walletsLogger.info("stellarWallet.upgrade.start");

        await this.preAuthIfNeeded();

        const upgradeTxId = await this.createWalletLifecycleTransaction("upgrade-wallet", options);

        if (upgradeTxId != null) {
            if (options?.prepareOnly) {
                walletsLogger.info("stellarWallet.upgrade.prepared", { transactionId: upgradeTxId });
                return {
                    hash: undefined,
                    explorerLink: undefined,
                    transactionId: upgradeTxId,
                } as TransactionResult<T>;
            }

            await this.approveTransactionAndWait(upgradeTxId);
            walletsLogger.info("stellarWallet.upgrade.phase1.success", { transactionId: upgradeTxId });
        } else {
            walletsLogger.info("stellarWallet.upgrade.phase1.skipped", {
                reason: "wallet already locked from a prior upgrade",
            });
        }

        const migrateResult = await this.migrateInternal(options);
        walletsLogger.info("stellarWallet.upgrade.success", {
            transactionId: migrateResult.transactionId,
            hash: migrateResult.hash,
        });
        return migrateResult as TransactionResult<T>;
    }

    /**
     * Run only the migration phase of a Stellar wallet upgrade. Use this when the
     * upgrade transaction has already confirmed on-chain (e.g. from a previous
     * `upgrade({ prepareOnly: true })` flow) and the wallet is in the locked state.
     *
     * @param options - Optional prepareOnly / signer override.
     */
    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "stellarWallet.migrate",
        buildContext(thisArg: StellarWallet) {
            return { chain: thisArg.chain, address: thisArg.address };
        },
    })
    public async migrate<T extends MigrateOptions | undefined = undefined>(options?: T): Promise<TransactionResult<T>> {
        await this.preAuthIfNeeded();
        return (await this.migrateInternal(options)) as TransactionResult<T>;
    }

    // Migration path without preAuth — used directly by upgrade() (which preAuths once
    // up front) and by public migrate() (which preAuths and wraps this call).
    private async migrateInternal(options: MigrateOptions | undefined): Promise<Transaction<boolean>> {
        walletsLogger.info("stellarWallet.migrate.start");

        const migrateTxId = await this.createWalletLifecycleTransaction("migrate-wallet", options);
        if (migrateTxId == null) {
            throw new TransactionNotCreatedError("Failed to create migrate-wallet transaction");
        }

        if (options?.prepareOnly) {
            walletsLogger.info("stellarWallet.migrate.prepared", { transactionId: migrateTxId });
            return {
                hash: undefined,
                explorerLink: undefined,
                transactionId: migrateTxId,
            };
        }

        const result = await this.approveTransactionAndWait(migrateTxId);
        walletsLogger.info("stellarWallet.migrate.success", {
            transactionId: migrateTxId,
            hash: result.hash,
        });
        return result;
    }

    private async createTransaction(params: StellarTransactionInput): Promise<CreateTransactionSuccessResponse> {
        const { contractId, options } = params;
        const signerParams = this.resolveSignerParams(options);

        // The `serialized-transaction` variant is accepted at runtime but not part of
        // the curated public OpenAPI spec, so its shape is not in the generated DTOs.
        // biome-ignore lint/suspicious/noExplicitAny: serialized-transaction variant not surfaced in public DTOs
        const transaction: any =
            "transaction" in params
                ? {
                      type: "serialized-transaction",
                      serializedTransaction: params.transaction,
                      contractId,
                  }
                : {
                      type: "contract-call" as const,
                      contractId,
                      method: params.method,
                      memo: params.memo != null ? { type: "text" as const, value: params.memo } : undefined,
                      args: params.args,
                  };

        const transactionCreationResponse = await this.apiClient.createTransaction(this.walletLocator, {
            params: {
                transaction,
                ...signerParams,
            },
        });

        if ("error" in transactionCreationResponse) {
            throwIfQuorumApiError(transactionCreationResponse);
            throw new TransactionNotCreatedError(JSON.stringify(transactionCreationResponse));
        }

        return transactionCreationResponse;
    }

    /**
     * Creates an `upgrade-wallet` or `migrate-wallet` transaction. Returns the
     * transaction id on success, or `null` if the server returned a 409 indicating
     * the wallet is already in the locked state — callers should treat this as a
     * signal to skip the phase and proceed to the next one.
     */
    private async createWalletLifecycleTransaction(
        type: "upgrade-wallet" | "migrate-wallet",
        options: MigrateOptions | undefined
    ): Promise<string | null> {
        const response = await this.apiClient.createTransaction(this.walletLocator, {
            params: {
                transaction: { type },
                ...this.lifecycleSignerParams(options),
            },
        });

        if ("error" in response) {
            if (type === "upgrade-wallet" && isWalletLockedError(response)) {
                return null;
            }
            throwIfQuorumApiError(response);
            throw new TransactionNotCreatedError(JSON.stringify(response));
        }

        return response.id;
    }

    // Only an explicit signer is forwarded: without one, the server uses the admin signer, which wallet-lifecycle
    // ops need (the upgrade DTO rejects the unqualified "api-key" locator).
    private lifecycleSignerParams(options: MigrateOptions | undefined): { signer?: string } {
        const signer = this.resolveExplicitSigner(options);
        return signer == null ? {} : { signer };
    }
}

function isWalletLockedError(response: unknown): boolean {
    return (
        typeof response === "object" &&
        response !== null &&
        "statusCode" in response &&
        (response as { statusCode?: unknown }).statusCode === WALLET_LOCKED_STATUS_CODE
    );
}
