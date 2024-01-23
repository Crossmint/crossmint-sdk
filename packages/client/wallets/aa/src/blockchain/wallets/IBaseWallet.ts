import type { SignTypedDataParams } from "@alchemy/aa-core";
import type { Deferrable } from "@ethersproject/properties";
import { type TransactionRequest, type TransactionResponse } from "@ethersproject/providers";
import { BigNumber } from "ethers";
import { SignableMessage } from "viem";

import { Token } from "../token/Tokens";

export interface IBaseWallet {
    getAddress(): Promise<string>;
    signMessage(message: Uint8Array | string | SignableMessage): Promise<string>;
    signTypedData(params: SignTypedDataParams): Promise<string>;
    transfer(toAddress: string, token: Token, quantity?: number, amount?: BigNumber): Promise<string>;
    sendTransaction(transaction: Deferrable<TransactionRequest>): Promise<TransactionResponse>;
}
