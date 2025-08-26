import type { Address } from "viem";

import type {
    BalanceControllerGetBalanceForLocator2Error,
    CreateSignatureRequestDto,
    CreateSignerInputDto,
    CreateTransactionDto,
    CreateWalletDto,
    DelegatedSignerDto,
    SendTokenDto,
    SubmitApprovalDto,
    WalletBalanceResponseDto,
    WalletV1Alpha2ErrorDto,
    WalletV1Alpha2TransactionErrorDto,
    WalletV1Alpha2ResponseDto,
    WalletsV1Alpha2MultipleSignatureResponseDto,
    WalletsSendTokenControllerSendToken2Response,
    WalletsV1Alpha2SignatureResponseDto,
    WalletsV1Alpha2TransactionResponseDto,
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

export type CreateWalletParams =
    | CreateWalletDto
    | (CreateWalletDto & {
          type: "solana-smart-wallet";
          config?: {
              adminSigner?:
                  | {
                        type: "solana-keypair";
                        address: string;
                    }
                  | {
                        type: "solana-fireblocks-custodial";
                    };
              delegatedSigners?: Array<{
                  signer: string;
              }>;
          };
      });
export type GetWalletSuccessResponse = WalletV1Alpha2ResponseDto;
export type CreateWalletResponse = GetWalletSuccessResponse | WalletV1Alpha2ErrorDto;
export type GetWalletResponse = GetWalletSuccessResponse | WalletV1Alpha2ErrorDto;

export type AdminSignerConfig = NonNullable<
    Extract<CreateWalletDto, { config: { adminSigner: Record<string, unknown> } }>["config"]
>["adminSigner"];

export type CreateTransactionParams = CreateTransactionDto;
export type CreateTransactionSuccessResponse = WalletsV1Alpha2TransactionResponseDto;
export type CreateTransactionResponse = CreateTransactionSuccessResponse | WalletV1Alpha2TransactionErrorDto;
export type ApproveTransactionParams = SubmitApprovalDto;
export type ApproveTransactionResponse =
    | WalletsV1Alpha2TransactionResponseDto
    | WalletsV1ControllerSubmitApprovals4Error;
export type GetTransactionResponse = WalletsV1Alpha2TransactionResponseDto | WalletsV1ControllerGetTransaction4Error;
export type GetTransactionSuccessResponse = WalletsV1Alpha2TransactionResponseDto;

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
    | WalletsV1Alpha2MultipleSignatureResponseDto
    | WalletsV1ControllerGetTransactionsWithoutChain4Error;
export type GetNftsResponse = any; // TODO: Find correct type
export type GetBalanceResponse = WalletBalanceResponseDto | BalanceControllerGetBalanceForLocator2Error;
export type GetBalanceSuccessResponse = WalletBalanceResponseDto;
export type GetActivityResponse = WalletsV1Alpha2ActivityResponseDto | WalletV1Alpha2ErrorDto;
export type Activity = WalletsV1Alpha2ActivityResponseDto;

export type RegisterSignerChain = Extract<CreateSignerInputDto, { chain: string }>["chain"];
export type RegisterSignerPasskeyParams = Extract<CreateSignerInputDto["signer"], { type: "passkey" }>;
export type RegisterSignerParams = {
    signer: string | RegisterSignerPasskeyParams;
    chain?: RegisterSignerChain;
};
export type RegisterSignerResponse = DelegatedSignerDto | WalletsV1ControllerCreateDelegatedSigner4Error;
export type GetSignerResponse = DelegatedSignerDto | WalletsV1ControllerGetDelegatedSigner4Error;
export type GetDelegatedSignersResponse = Array<DelegatedSignerDto> | WalletsV1ControllerGetDelegatedSigner4Error;
export type DelegatedSigner = DelegatedSignerDto;

export type SendParams = SendTokenDto;
export type SendResponse = WalletsSendTokenControllerSendToken2Response;

type WalletType = "smart" | "mpc";
type SolanaAddress = string;
type EvmWalletLocator = `me:evm:${WalletType}` | Address;
type SolanaWalletLocator = `me:solana:${WalletType}` | SolanaAddress;
export type WalletLocator = EvmWalletLocator | SolanaWalletLocator;
