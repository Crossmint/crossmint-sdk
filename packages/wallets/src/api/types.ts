import type { Address } from "viem";

import type {
    BalanceControllerGetBalanceForLocator2Error,
    CreateSignatureV2025Dto,
    CreateSignerV2025InputDto,
    CreateTransactionV2025Dto,
    CreateWalletV2025Dto,
    DelegatedSignerV2025Dto,
    SendTokenDto,
    SubmitApprovalV2025Dto,
    WalletBalanceV20250609ResponseDto,
    WalletNftsResponseDto,
    WalletV1Alpha2ErrorDto,
    WalletV1Alpha2TransactionErrorDto,
    WalletV2025ResponseDtoReadable,
    WalletsMultipleTransactionV2025ResponseDto,
    WalletsSendTokenControllerSendToken2Response,
    WalletsSignatureV2025ResponseDto,
    WalletsTransactionV2025ResponseDto,
    WalletsV1Alpha2ActivityResponseDto,
    WalletsV1ControllerCreateDelegatedSigner4Error,
    WalletsV1ControllerCreateSignatureRequest4Error,
    WalletsV1ControllerGetDelegatedSigner4Error,
    WalletsV1ControllerGetSignature4Error,
    WalletsV1ControllerGetTransaction4Error,
    WalletsV1ControllerGetTransactionsWithoutChain4Error,
    WalletsV1ControllerSubmitApprovals4Error,
    WalletsV1ControllerSubmitSignatureApprovals4Error,
} from "./gen/types.gen";

export type CreateWalletParams = CreateWalletV2025Dto;
export type GetWalletSuccessResponse = WalletV2025ResponseDtoReadable;
export type CreateWalletResponse = GetWalletSuccessResponse | WalletV1Alpha2ErrorDto;
export type GetWalletResponse = GetWalletSuccessResponse | WalletV1Alpha2ErrorDto;

export type AdminSignerConfig = NonNullable<
    Extract<CreateWalletV2025Dto, { chainType: "evm" | "solana" | "stellar"; config: { adminSigner: any } }>["config"]
>["adminSigner"];

export type CreateTransactionParams = CreateTransactionV2025Dto;
export type CreateTransactionSuccessResponse = WalletsTransactionV2025ResponseDto;
export type CreateTransactionResponse = CreateTransactionSuccessResponse | WalletV1Alpha2TransactionErrorDto;
export type ApproveTransactionParams = SubmitApprovalV2025Dto;
export type ApproveTransactionResponse = WalletsTransactionV2025ResponseDto | WalletsV1ControllerSubmitApprovals4Error;
export type GetTransactionResponse = WalletsTransactionV2025ResponseDto | WalletsV1ControllerGetTransaction4Error;
export type GetTransactionSuccessResponse = WalletsTransactionV2025ResponseDto;

export type CreateSignatureParams = CreateSignatureV2025Dto;
export type CreateSignatureResponse =
    | WalletsSignatureV2025ResponseDto
    | WalletsV1ControllerCreateSignatureRequest4Error;
export type ApproveSignatureParams = SubmitApprovalV2025Dto;
export type ApproveSignatureResponse =
    | WalletsSignatureV2025ResponseDto
    | WalletsV1ControllerSubmitSignatureApprovals4Error;
export type GetSignatureResponse = WalletsSignatureV2025ResponseDto | WalletsV1ControllerGetSignature4Error;

export type GetTransactionsResponse =
    | WalletsMultipleTransactionV2025ResponseDto
    | WalletsV1ControllerGetTransactionsWithoutChain4Error;
export type GetNftsResponse = WalletNftsResponseDto;
export type GetBalanceResponse = WalletBalanceV20250609ResponseDto | BalanceControllerGetBalanceForLocator2Error;
export type GetBalanceSuccessResponse = WalletBalanceV20250609ResponseDto;
export type GetActivityResponse = WalletsV1Alpha2ActivityResponseDto | WalletV1Alpha2ErrorDto;
export type Activity = WalletsV1Alpha2ActivityResponseDto;

export type RegisterSignerChain = Extract<CreateSignerV2025InputDto, { chain: any }>["chain"];
export type RegisterSignerPasskeyParams = Extract<CreateSignerV2025InputDto["signer"], { type: "passkey" }>;
export type RegisterSignerParams = {
    signer: string | RegisterSignerPasskeyParams;
    chain?: RegisterSignerChain;
};
export type RegisterSignerResponse = DelegatedSignerV2025Dto | WalletsV1ControllerCreateDelegatedSigner4Error;
export type GetSignerResponse = DelegatedSignerV2025Dto | WalletsV1ControllerGetDelegatedSigner4Error;
export type GetDelegatedSignersResponse = Array<DelegatedSignerV2025Dto> | WalletsV1ControllerGetDelegatedSigner4Error;
export type DelegatedSigner = DelegatedSignerV2025Dto;

export type SendParams = SendTokenDto;
export type SendResponse = WalletsSendTokenControllerSendToken2Response;

type WalletType = "smart" | "mpc";
type SolanaAddress = string;
type EvmWalletLocator = `me:evm:${WalletType}` | Address;
type SolanaWalletLocator = `me:solana:${WalletType}` | SolanaAddress;
export type WalletLocator = EvmWalletLocator | SolanaWalletLocator;
