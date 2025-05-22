import { STATUS_POLLING_INTERVAL_MS } from "@/utils/constants";
import { sleep } from "@/utils";
import type { ApprovalRequest, ApprovalServiceConfig, ChainSpecificApprovalService } from "./types";
import { TransactionConfirmationTimeoutError } from "@/utils/errors";

export abstract class BaseApprovalServiceImpl implements ChainSpecificApprovalService {
    protected constructor(protected readonly config: ApprovalServiceConfig) {}

    abstract approve(request: ApprovalRequest): Promise<void>;
    abstract getApprovalStatus(requestId: string): Promise<ApprovalRequest>;

    async waitForApproval(requestId: string): Promise<void> {
        const startTime = Date.now();
        const timeoutMs = 60000; // 60 seconds timeout

        while (true) {
            if (Date.now() - startTime > timeoutMs) {
                throw new TransactionConfirmationTimeoutError("Approval confirmation timeout");
            }

            const response = await this.getApprovalStatus(requestId);
            if (response.status === "success") {
                return;
            }
            if (response.status === "failed") {
                throw new Error(`Approval failed: ${JSON.stringify(response)}`);
            }

            await sleep(STATUS_POLLING_INTERVAL_MS);
        }
    }
}
