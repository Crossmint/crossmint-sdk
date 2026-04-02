import type { Address } from "viem";

import type {
    BalanceControllerFundWallet4Error,
    BalanceControllerFundWallet4Responses,
    BalanceV20250609ControllerGetBalanceForLocator2Error,
    CreateSignatureV2025Dto,
    CreateSignerV2025InputDtoClass,
    CreateTransactionV2025DtoClass,
    CreateWalletV2025DtoClass,
    DelegatedSignerV2025DtoClass,
    FundWalletAmountDto,
    SendTokenDto,
    SubmitApprovalV2025Dto,
    WalletBalanceV20250609ResponseDto,
    WalletV1Alpha2ErrorDto,
    WalletV1Alpha2TransactionErrorDto,
    WalletV2025ResponseDtoClass,
    WalletsActivityResponseUnstableDto,
    WalletsMultipleTransactionV2025ResponseDto,
    WalletsSendTokenControllerSendToken2Response,
    WalletsSignatureV2025ResponseDto,
    WalletsTransactionV2025ResponseDtoClass,
    WalletsV2025ControllerCreateDelegatedSigner2Error,
    WalletsV2025ControllerCreateSignatureRequest2Error,
    WalletsV2025ControllerGetDelegatedSigner2Error,
    WalletsV2025ControllerGetSignature2Error,
    WalletsV2025ControllerGetTransaction2Error,
    WalletsV2025ControllerGetTransactionsWithoutChain2Error,
    WalletsV2025ControllerSubmitApprovals2Error,
    WalletsV2025ControllerSubmitSignatureApprovals2Error,
} from "./gen/types.gen";
import type { SignerConfigForChain, SignerLocator } from "@/signers/types";
import type { Chain } from "@/chains/chains";

export type CreateWalletParams = CreateWalletV2025DtoClass;
export type GetWalletSuccessResponse = WalletV2025ResponseDtoClass;
export type CreateWalletResponse = GetWalletSuccessResponse | WalletV1Alpha2ErrorDto;
export type GetWalletResponse = GetWalletSuccessResponse | WalletV1Alpha2ErrorDto;

export type RecoverySignerConfig = NonNullable<
    Extract<CreateWalletV2025DtoClass, { config: { adminSigner: Record<string, unknown> } }>["config"]
>["adminSigner"];

export type CreateTransactionParams = CreateTransactionV2025DtoClass;
export type CreateTransactionSuccessResponse = WalletsTransactionV2025ResponseDtoClass;
export type CreateTransactionResponse = CreateTransactionSuccessResponse | WalletV1Alpha2TransactionErrorDto;
export type ApproveTransactionParams = SubmitApprovalV2025Dto;
export type ApproveTransactionResponse =
    | WalletsTransactionV2025ResponseDtoClass
    | WalletsV2025ControllerSubmitApprovals2Error;
export type GetTransactionResponse =
    | WalletsTransactionV2025ResponseDtoClass
    | WalletsV2025ControllerGetTransaction2Error;
export type GetTransactionSuccessResponse = WalletsTransactionV2025ResponseDtoClass;

export type CreateSignatureParams = CreateSignatureV2025Dto;
export type CreateSignatureResponse =
    | WalletsSignatureV2025ResponseDto
    | WalletsV2025ControllerCreateSignatureRequest2Error;
export type ApproveSignatureParams = SubmitApprovalV2025Dto;
export type ApproveSignatureResponse =
    | WalletsSignatureV2025ResponseDto
    | WalletsV2025ControllerSubmitSignatureApprovals2Error;
export type GetSignatureResponse = WalletsSignatureV2025ResponseDto | WalletsV2025ControllerGetSignature2Error;

export type GetTransactionsResponse =
    | WalletsMultipleTransactionV2025ResponseDto
    | WalletsV2025ControllerGetTransactionsWithoutChain2Error;
export type GetBalanceResponse =
    | WalletBalanceV20250609ResponseDto
    | BalanceV20250609ControllerGetBalanceForLocator2Error;
export type GetBalanceSuccessResponse = WalletBalanceV20250609ResponseDto;
export type GetTransfersResponse = WalletsActivityResponseUnstableDto | WalletV1Alpha2ErrorDto;
export type Transfers = WalletsActivityResponseUnstableDto;
export type FundWalletParams = FundWalletAmountDto;
export type FundWalletResponse = BalanceControllerFundWallet4Responses | BalanceControllerFundWallet4Error;

export type RegisterSignerChain = Extract<CreateSignerV2025InputDtoClass, { chain: string }>["chain"];
export type RegisterSignerPasskeyParams = Extract<CreateSignerV2025InputDtoClass["signer"], { type: "passkey" }>;
export type RegisterSignerParams = {
    signer: SignerLocator | RegisterSignerPasskeyParams | SignerConfigForChain<Chain>;
    chain?: RegisterSignerChain;
};
export type RegisterSignerResponse = DelegatedSignerV2025DtoClass | WalletsV2025ControllerCreateDelegatedSigner2Error;
export type RemoveSignerParams = {
    chain?: RegisterSignerChain;
};
export type RemoveSignerResponse =
    | WalletsTransactionV2025ResponseDtoClass
    | WalletsV2025ControllerCreateDelegatedSigner2Error;
export type GetSignerResponse = DelegatedSignerV2025DtoClass | WalletsV2025ControllerGetDelegatedSigner2Error;
export type GetSignersResponse = Array<DelegatedSignerV2025DtoClass> | WalletsV2025ControllerGetDelegatedSigner2Error;
export type Signer = DelegatedSignerV2025DtoClass;

export type SendParams = SendTokenDto;
export type SendResponse = WalletsSendTokenControllerSendToken2Response;

type WalletType = "smart" | "mpc";
type SolanaAddress = string;
type EvmWalletLocator = `me:evm:${WalletType}` | Address;
type SolanaWalletLocator = `me:solana:${WalletType}` | SolanaAddress;
export type WalletLocator = EvmWalletLocator | SolanaWalletLocator;
