import { ZeroDevAccountSigner, ZeroDevEthersProvider } from "@zerodev/sdk";
import { ethers } from "ethers";
export class CustomEip1193Bridge {
    readonly signer: ZeroDevAccountSigner<"ECDSA">;
    readonly provider: ZeroDevEthersProvider<"ECDSA">;

    constructor(signer:ZeroDevAccountSigner<"ECDSA">, provider: ZeroDevEthersProvider<"ECDSA">) {
        this.signer = signer;
        this.provider = provider;
    }

    async send(method: string, params?: Array<any>): Promise<any> {
        function throwUnsupported(message: string): never {
            throw new Error('Error throwUnsupported: '+ message );
        }

        let coerce = (value: any) => value;

        switch (method) {
            case "eth_gasPrice": {
                 const result = await this.provider.getGasPrice();
                 return result.toHexString();
            }
            case "eth_accounts": {
                const result = [ ];
                if (this.signer) {
                    const address = await this.signer.getAddress();
                    result.push(address);
                }
                return result;
            }
            case "eth_requestAccounts": {
               const result = [ ];
               if (this.signer) {
                   const address = await this.signer.getAddress();
                   result.push(address);
               }
               return result;
           }
            case "eth_blockNumber": {
                return await this.provider.getBlockNumber();
            }
            case "eth_chainId": {
                const result = await this.provider.getNetwork();
                return result.chainId;
            }
            case "eth_getBalance": {
                const result = await this.provider.getBalance(params![0], params![1]);
                return result.toHexString();
            }
            case "eth_getStorageAt": {
                return this.provider.getStorageAt(params![0], params![1], params![2]);
            }
            case "eth_getTransactionCount": {
                const result = await this.provider.getTransactionCount(params![0], params![1]);
                return ethers.utils.hexValue(result);
            }
            case "eth_getBlockTransactionCountByHash":
            case "eth_getBlockTransactionCountByNumber": {
                const result = await this.provider.getBlock(params![0]);
                return ethers.utils.hexValue(result.transactions.length);
            }
            case "eth_getCode": {
                const result = await this.provider.getBlock(params![0]);
                return result;
            }
            case "eth_sendRawTransaction": {
                return await this.provider.sendTransaction(params![0]);
            }
            case "eth_call": {
                const req = ethers.providers.JsonRpcProvider.hexlifyTransaction(params![0]);
                return await this.provider.call(req, params![1]);
            }
            case "estimateGas": {
                if (params![1] && params![1] !== "latest") {
                    throwUnsupported("estimateGas does not support blockTag");
                }

                const req = ethers.providers.JsonRpcProvider.hexlifyTransaction(params![0]);
                const result = await this.provider.estimateGas(req);
                return result.toHexString();
            }

            // @TOOD: Transform? No uncles?
            case "eth_getBlockByHash":
            case "eth_getBlockByNumber": {
                if (params![1]) {
                    return await this.provider.getBlockWithTransactions(params![0]);
                } else {
                    return await this.provider.getBlock(params![0]);
                }
            }
            case "eth_getTransactionByHash": {
                return await this.provider.getTransaction(params![0]);
            }
            case "eth_getTransactionReceipt": {
                return await this.provider.getTransactionReceipt(params![0]);
            }

            case "eth_sign": {
                if (!this.signer) {
                    return throwUnsupported("eth_sign requires an account");
                }

                const address = await this.signer.getAddress();
                if (address !== ethers.utils.getAddress(params![0])) {
                    throw new Error('Error getting address');
                }

                return this.signer.signMessage(ethers.utils.arrayify(params![1]));
            }

            case "eth_signTransaction": {
                if (!this.signer) {
                    throwUnsupported("eth_signTransaction requires a signer");
                }
                const transaction = params![0];
                transaction.value = `0x${transaction.value.toString(16)}`;
                transaction.maxPriorityFeePerGas = `0x${transaction.maxPriorityFeePerGas.toString(16)}`;
                transaction.maxFeePerGas = `0x${transaction.maxFeePerGas.toString(16)}`;
                transaction.gasLimit = `0x${transaction.gas.toString(16)}`;
                transaction.chainId = transaction.chainId;
                transaction.type = 2;
                delete transaction.gas;
                // Sign the transaction with the signer
                const signedTransaction = await this.signer.signTransaction(transaction);
                // Return the serialized, signed transaction
                return signedTransaction;
            }

           case "personal_sign": {
               if (!this.signer) {
                   throwUnsupported("personal_sign requires a signer");
               }

               const message = params![1];
               const prefixedMessage = `\x19Ethereum Signed Message:\n${message.length}${message}`;
               const hashedMessage = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(prefixedMessage));
               return await this.signer.signMessage(ethers.utils.arrayify(hashedMessage));
           }

            case "eth_sendTransaction": {
                if (!this.signer) {
                    return throwUnsupported("eth_sign requires an account");
                }

                const req = ethers.providers.JsonRpcProvider.hexlifyTransaction(params![0]);
                const tx = await this.signer.sendTransaction(req);
                return tx.hash;
            }

            case "eth_getUncleCountByBlockHash":
            case "eth_getUncleCountByBlockNumber":
            {
                coerce = ethers.utils.hexValue;
                break;
            }

            case "eth_getTransactionByBlockHashAndIndex":
            case "eth_getTransactionByBlockNumberAndIndex":
            case "eth_getUncleByBlockHashAndIndex":
            case "eth_getUncleByBlockNumberAndIndex":
            case "eth_newFilter":
            case "eth_newBlockFilter":
            case "eth_newPendingTransactionFilter":
            case "eth_uninstallFilter":
            case "eth_getFilterChanges":
            case "eth_getFilterLogs":
            case "eth_getLogs":
                break;
        }

        // If our provider supports send, maybe it can do a better job?
        if ((<any>(this.provider)).send) {
            const result = await (<any>(this.provider)).send(method, params);
            return coerce(result);
        }

        return throwUnsupported(`unsupported method: ${ method }`);
    }

}