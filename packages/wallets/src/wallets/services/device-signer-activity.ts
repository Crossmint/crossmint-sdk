import type { ApiClient, WalletLocator } from "../../api";
import { walletsLogger } from "../../logger";

const PAGE_SIZE = 50;
const MAX_PAGES = 4;

type Approval = { signer?: { locator?: string }; submittedAt?: number | string };
type ApprovalRecord = { approvals?: { submitted?: Approval[] } };
type RegistrationRecord = { createdAt?: number | string };
type DelegatedSignerRecord = {
    locator?: string;
    transaction?: RegistrationRecord;
    chains?: Record<string, RegistrationRecord | undefined>;
};

export async function fetchDeviceSignerActivity(
    apiClient: ApiClient,
    walletLocator: WalletLocator
): Promise<Map<string, number>> {
    const activity = new Map<string, number>();
    const record = (locator: string | undefined, time: number | string | undefined) => {
        if (locator == null || !locator.startsWith("device:") || time == null) {
            return;
        }
        const timestamp = typeof time === "number" ? time : Date.parse(time);
        if (Number.isNaN(timestamp)) {
            return;
        }
        activity.set(locator, Math.max(activity.get(locator) ?? 0, timestamp));
    };

    const wallet = await apiClient.getWallet(walletLocator);
    if ("error" in wallet) {
        throw new Error(`Failed to fetch wallet: ${JSON.stringify(wallet)}`);
    }
    const config = wallet.config as { delegatedSigners?: DelegatedSignerRecord[] } | undefined;
    const delegatedSigners = config?.delegatedSigners ?? [];
    for (const signer of delegatedSigners) {
        record(signer.locator, signer.transaction?.createdAt);
        for (const registration of Object.values(signer.chains ?? {})) {
            record(signer.locator, registration?.createdAt);
        }
    }

    const recordApprovals = (items: ApprovalRecord[]) => {
        for (const item of items) {
            for (const approval of item.approvals?.submitted ?? []) {
                record(approval.signer?.locator, approval.submittedAt);
            }
        }
    };
    await forEachPage(
        "transactions",
        async (page) => {
            const response = await apiClient.getTransactions(walletLocator, { page, perPage: PAGE_SIZE });
            return "transactions" in response ? (response.transactions as ApprovalRecord[]) : null;
        },
        recordApprovals
    );
    await forEachPage(
        "signatures",
        async (page) => {
            const response = await apiClient.getSignatures(walletLocator, { page, perPage: PAGE_SIZE });
            return "signatures" in response ? (response.signatures as ApprovalRecord[]) : null;
        },
        recordApprovals
    );

    return activity;
}

async function forEachPage(
    kind: string,
    fetchPage: (page: number) => Promise<ApprovalRecord[] | null>,
    onPage: (items: ApprovalRecord[]) => void
): Promise<void> {
    for (let page = 1; page <= MAX_PAGES; page++) {
        let items: ApprovalRecord[] | null;
        try {
            items = await fetchPage(page);
        } catch (error) {
            walletsLogger.warn("wallet.deviceSignerActivity.pageFailed", { kind, page, error });
            return;
        }
        if (items == null) {
            walletsLogger.warn("wallet.deviceSignerActivity.pageFailed", { kind, page });
            return;
        }
        onPage(items);
        if (items.length < PAGE_SIZE) {
            return;
        }
    }
}
