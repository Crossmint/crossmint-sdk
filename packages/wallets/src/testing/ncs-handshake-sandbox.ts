import { HandshakeParent, type SimpleMessageEvent, type Transport } from "@crossmint/client-sdk-window";
import { signerInboundEvents, signerOutboundEvents } from "@crossmint/client-signers";

export type SandboxTEEFailure =
    | "attestation-rejected"
    | "ready-never-sent"
    | "handshake-timed-out"
    | "storage-unavailable";

type Deliver = (event: string, data: unknown) => void;

class InProcessSignerTransport implements Transport<typeof signerInboundEvents> {
    private readonly listeners = new Map<string, (message: SimpleMessageEvent) => void>();
    private nextListenerId = 0;

    constructor(private readonly respond: (event: string, data: unknown, deliver: Deliver) => void) {}

    send(message: { event: string; data: unknown }): void {
        const deliver: Deliver = (event, data) => {
            const simpleEvent: SimpleMessageEvent = { type: "message", data: { event, data: data as object } };
            for (const listener of this.listeners.values()) {
                listener(simpleEvent);
            }
        };
        this.respond(String(message.event), message.data, deliver);
    }

    addMessageListener(listener: (message: SimpleMessageEvent) => void): string {
        const id = String(this.nextListenerId++);
        this.listeners.set(id, listener);
        return id;
    }

    removeMessageListener(id: string): void {
        this.listeners.delete(id);
    }
}

const READY_STATUS = { status: "success" as const, signerStatus: "ready" as const, publicKeys: {} };

export class SandboxNcsConnection {
    private failure?: SandboxTEEFailure;
    private torndown = false;

    setFailure(failure: SandboxTEEFailure | undefined): void {
        this.failure = failure;
    }

    tearDownFrame(): void {
        this.torndown = true;
    }

    createConnection(): HandshakeParent<typeof signerOutboundEvents, typeof signerInboundEvents> {
        const transport = new InProcessSignerTransport((event, data, deliver) => {
            if (this.torndown) {
                return;
            }

            if (event === "handshakeRequest") {
                if (this.failure === "handshake-timed-out") {
                    return;
                }
                deliver("handshakeResponse", data);
                return;
            }

            if (event === "request:get-status") {
                if (this.failure === "ready-never-sent") {
                    return;
                }
                if (this.failure === "attestation-rejected") {
                    deliver("response:get-status", {
                        status: "error",
                        error: "Attestation rejected",
                        code: "ATTESTATION_REJECTED",
                    });
                    return;
                }
                deliver("response:get-status", READY_STATUS);
                return;
            }

            if (event === "request:start-onboarding" || event === "request:complete-onboarding") {
                const responseEvent =
                    event === "request:start-onboarding" ? "response:start-onboarding" : "response:complete-onboarding";
                if (this.failure === "storage-unavailable") {
                    deliver(responseEvent, { status: "error", error: "Device signer storage is unavailable" });
                    return;
                }
                deliver(responseEvent, READY_STATUS);
            }
        });

        return new HandshakeParent(transport, {
            incomingEvents: signerOutboundEvents,
            outgoingEvents: signerInboundEvents,
            handshakeOptions: { timeoutMs: 30_000, intervalMs: 100 },
        });
    }
}
