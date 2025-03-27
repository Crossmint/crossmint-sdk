import type { Address } from "viem";

import type {
    CreateWalletDto,
    WalletV1Alpha2ErrorDto,
    WalletV1Alpha2ResponseDto,
    CreateTransactionDto,
    SubmitApprovalDto,
    WalletsV1ControllerGetTransaction4Response,
    WalletsV1ControllerSubmitApprovals4Error,
    WalletsV1ControllerGetTransaction4Error,
    WalletsV1Alpha2TransactionResponseDto,
    WalletsV1ControllerCreateTransaction4Error,
    WalletsV1ControllerGetSignature4Error,
    CreateSignatureRequestDto,
    WalletsV1Alpha2SignatureResponseDto,
    WalletsV1ControllerCreateSignatureRequest4Error,
    WalletsV1ControllerSubmitSignatureApprovals4Error,
    WalletsV1Alpha2TransactionsResponseDto,
    WalletsV1ControllerGetTransactionsWithoutChain4Error,
    Nftevm,
    Nftsol,
    FetchContentFromWalletError,
    WalletBalanceResponseDto,
    BalanceControllerGetBalanceForLocator2Error,
    CreateSignerInputDto,
    DelegatedSignerDto,
    WalletsV1ControllerCreateDelegatedSigner4Error,
    WalletsV1ControllerGetDelegatedSigner4Error,
} from "./gen/types.gen";

export type CreateWalletParams = CreateWalletDto;
export type GetWalletSuccessResponse = WalletV1Alpha2ResponseDto;
export type CreateWalletResponse = GetWalletSuccessResponse | WalletV1Alpha2ErrorDto;
export type GetWalletResponse = GetWalletSuccessResponse | WalletV1Alpha2ErrorDto;

export type CreateTransactionParams = CreateTransactionDto;
export type CreateTransactionSuccessResponse = WalletsV1Alpha2TransactionResponseDto;
export type CreateTransactionResponse = CreateTransactionSuccessResponse | WalletsV1ControllerCreateTransaction4Error;
export type ApproveTransactionParams = SubmitApprovalDto;
export type ApproveTransactionResponse =
    | WalletsV1ControllerGetTransaction4Response
    | WalletsV1ControllerSubmitApprovals4Error;
export type GetTransactionResponse = WalletsV1Alpha2TransactionResponseDto | WalletsV1ControllerGetTransaction4Error;

export type CreateSignatureParams = CreateSignatureRequestDto;
export type CreateSignatureResponse =
    | WalletsV1Alpha2SignatureResponseDto
    | WalletsV1ControllerCreateSignatureRequest4Error;
export type ApproveSignatureParams = SubmitApprovalDto;
export type ApproveSignatureResponse =
    | WalletsV1Alpha2SignatureResponseDto
    | WalletsV1ControllerSubmitSignatureApprovals4Error;
export type GetSignatureResponse = WalletsV1Alpha2SignatureResponseDto | WalletsV1ControllerGetSignature4Error;

export type GetTransactionsResponse =
    | WalletsV1Alpha2TransactionsResponseDto
    | WalletsV1ControllerGetTransactionsWithoutChain4Error;
export type GetNftsResponse = Nftevm | Nftsol | FetchContentFromWalletError;
export type GetBalanceResponse = WalletBalanceResponseDto | BalanceControllerGetBalanceForLocator2Error;

export type RegisterSignerParams = CreateSignerInputDto;
export type RegisterSignerResponse = DelegatedSignerDto | WalletsV1ControllerCreateDelegatedSigner4Error;
export type GetSignerResponse = DelegatedSignerDto | WalletsV1ControllerGetDelegatedSigner4Error;
type WalletType = CreateWalletDto["type"];
export type EvmWalletLocator = `me:${WalletType}` | Address;
type SolanaAddress = string;
export type SolanaWalletLocator = `me:${WalletType}` | SolanaAddress;
export type WalletLocator = EvmWalletLocator | SolanaWalletLocator;
