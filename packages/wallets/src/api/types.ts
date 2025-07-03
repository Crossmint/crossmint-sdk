import type { Address } from "viem";

import type {
    WalletV1Alpha2ErrorDto,
    WalletsV1ControllerSubmitApprovals4Error,
    WalletsV1ControllerGetTransaction4Error,
    WalletsV1ControllerGetSignature4Error,
    WalletsV1ControllerCreateSignatureRequest4Error,
    WalletsV1ControllerSubmitSignatureApprovals4Error,
    WalletsV1ControllerGetTransactionsWithoutChain4Error,
    BalanceControllerGetBalanceForLocator2Error,
    WalletsV1ControllerCreateDelegatedSigner4Error,
    WalletsV1ControllerGetDelegatedSigner4Error,
    WalletsSendTokenControllerSendToken2Response,
    SendTokenDto,
    WalletBalanceUnstableResponseDto,
    WalletsV1Alpha2ActivityResponseDto,
    WalletV2025ResponseDto,
    CreateWalletV2025Dto,
    CreateTransactionV2025Dto,
    WalletsTransactionV2025ResponseDto,
    WalletV1Alpha2TransactionErrorDto,
    SubmitApprovalV2025Dto,
    WalletsMultipleTransactionV2025ResponseDto,
    CreateSignatureV2025Dto,
    WalletsSignatureV2025ResponseDto,
    CreateSignerV2025InputDto,
    DelegatedSignerV2025Dto,
    WalletNftsResponseDto,
} from "./gen/types.gen";

export type CreateWalletParams = CreateWalletV2025Dto;
export type GetWalletSuccessResponse = WalletV2025ResponseDto;
export type CreateWalletResponse = GetWalletSuccessResponse | WalletV1Alpha2ErrorDto;
export type GetWalletResponse = GetWalletSuccessResponse | WalletV1Alpha2ErrorDto;

export type AdminSignerConfig = NonNullable<
    Extract<CreateWalletV2025Dto, { chainType: "evm" | "solana" }>["config"]
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
export type GetBalanceResponse = WalletBalanceUnstableResponseDto | BalanceControllerGetBalanceForLocator2Error;
export type GetBalanceSuccessResponse = WalletBalanceUnstableResponseDto;
export type GetActivityResponse = WalletsV1Alpha2ActivityResponseDto | WalletV1Alpha2ErrorDto;
export type Activity = WalletsV1Alpha2ActivityResponseDto;

export type RegisterSignerParams = CreateSignerV2025InputDto;
export type RegisterSignerResponse = DelegatedSignerV2025Dto | WalletsV1ControllerCreateDelegatedSigner4Error;
export type GetSignerResponse = DelegatedSignerV2025Dto | WalletsV1ControllerGetDelegatedSigner4Error;
export type GetDelegatedSignersResponse = Array<DelegatedSignerV2025Dto> | WalletsV1ControllerGetDelegatedSigner4Error;
export type DelegatedSigner = DelegatedSignerV2025Dto;

export type SendParams = SendTokenDto;
export type SendResponse = WalletsSendTokenControllerSendToken2Response;

type WalletType = "smart" | "mpc";
type SolanaAddress = string;
export type EvmWalletLocator = `me:evm:${WalletType}` | Address;
export type SolanaWalletLocator = `me:solana:${WalletType}` | SolanaAddress;
export type WalletLocator = EvmWalletLocator | SolanaWalletLocator;
