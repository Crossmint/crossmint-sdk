import { ZeroDevAccountSigner, ZeroDevEthersProvider } from "@zerodev/sdk";
import { ethers } from "ethers";
export class ZeroDevEip1193Bridge {
    readonly signer: ZeroDevAccountSigner<"ECDSA">;
    readonly provider: ZeroDevEthersProvider<"ECDSA">;

    constructor(signer: ZeroDevAccountSigner<"ECDSA">, provider: ZeroDevEthersProvider<"ECDSA">) {
        this.signer = signer;
        this.provider = provider;
    }

    async send(method: string, params?: Array<any>): Promise<any> {
        let coerce = (value: any) => value;

        switch (method) {
            case "eth_gasPrice": {
                 const result = await this.provider.getGasPrice();
                 return result.toHexString();
            }
            case "eth_accounts":
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
                const balance = await this.provider.getBalance(params![0], params![1]);
                return balance.toHexString();
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
                delete params![0].from;
                const req = ethers.providers.JsonRpcProvider.hexlifyTransaction(params![0]);
                return await this.provider.call(req, params![1]);
            }
            case "estimateGas": {
                if (params![1] != null && params![1] !== "latest") {
                    throwUnsupported("estimateGas does not support blockTag");
                }

                const req = ethers.providers.JsonRpcProvider.hexlifyTransaction(params![0]);
                const result = await this.provider.estimateGas(req);
                return result.toHexString();
            }

            case "eth_getBlockByHash":
            case "eth_getBlockByNumber": {
                if (params![1] != null) {
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
                if (this.signer == null) {
                    return throwUnsupported("eth_sign requires an account");
                }

                const address = await this.signer.getAddress();
                if (address !== ethers.utils.getAddress(params![0])) {
                    throw new Error('Error getting address');
                }

                return this.signer.signMessage(ethers.utils.arrayify(params![1]));
            }

            case "eth_signTransaction": {
                if (this.signer == null) {
                    throwUnsupported("eth_signTransaction requires a signer");
                }
                const transaction = params![0];
                transaction.value = `0x${transaction.value.toString(16)}`;
                transaction.maxPriorityFeePerGas = `0x${transaction.maxPriorityFeePerGas.toString(16)}`;
                transaction.maxFeePerGas = `0x${transaction.maxFeePerGas.toString(16)}`;
                transaction.gasLimit = `0x${transaction.gas.toString(16)}`;
                transaction.type = 2;
                delete transaction.gas;
                const signedTransaction = await this.signer.signTransaction(transaction);
                return signedTransaction;
            }

           case "personal_sign": {
               if (this.signer == null) {
                   throwUnsupported("personal_sign requires a signer");
               }

               const message = params![1];
               const prefixedMessage = `\x19Ethereum Signed Message:\n${message.length}${message}`;
               const hashedMessage = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(prefixedMessage));
               return await this.signer.signMessage(ethers.utils.arrayify(hashedMessage));
           }

            case "eth_sendTransaction": {
                if (this.signer == null) {
                    return throwUnsupported("eth_sign requires an account");
                }
                delete params![0].from;
                delete params![0].gas;
                const req = ethers.providers.JsonRpcProvider.hexlifyTransaction(params![0]);
                req.gasLimit = req.gas;
                delete req.gas;
                const tx = await this.signer.sendTransaction(req);
                return tx.hash;
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
                console.log(`${method} not supported`)
                break;
        }

        if (this.provider.send) {
            const result = await this.provider.send(method, params ?? []);
            return coerce(result);
        }

        return throwUnsupported(`unsupported method: ${ method }`);
    }
}

function throwUnsupported(message: string): never {
    throw new Error('Error throwUnsupported: '+ message );
}