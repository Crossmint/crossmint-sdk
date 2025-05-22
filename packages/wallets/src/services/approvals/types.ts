import type { ApiClient } from "@/api";

export type ApprovalStatus = "pending" | "awaiting-approval" | "success" | "failed";

export interface ApprovalRequest {
    id: string;
    status: ApprovalStatus;
    pendingApprovals?: Array<{
        signer: string;
        message: string;
    }>;
    submittedApprovals?: Array<{
        signer: string;
        signature: string;
        submittedAt: number;
        message: string;
    }>;
}

export interface BaseApprovalService {
    approve(request: ApprovalRequest): Promise<void>;
    waitForApproval(requestId: string): Promise<void>;
}

export interface ApprovalServiceConfig {
    walletLocator: string;
    apiClient: ApiClient;
}

export interface ChainSpecificApprovalService extends BaseApprovalService {
    getApprovalStatus(requestId: string): Promise<ApprovalRequest>;
}
