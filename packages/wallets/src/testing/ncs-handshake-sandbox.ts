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
        // Deferred to a microtask: EventEmitter.sendAction only assigns its retry interval
        // *after* this synchronous send() call returns, so a synchronous reply would resolve
        // the response listener before that assignment runs — leaving a setInterval with
        // nothing left to ever clear it, resending the request forever.
        const deliver: Deliver = (event, data) => {
            queueMicrotask(() => {
                const simpleEvent: SimpleMessageEvent = { type: "message", data: { event, data: data as object } };
                for (const listener of this.listeners.values()) {
                    listener(simpleEvent);
                }
            });
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

const readyStatus = () => ({ status: "success" as const, signerStatus: "ready" as const, publicKeys: {} });
const newDeviceStatus = () => ({ status: "success" as const, signerStatus: "new-device" as const });

export class SandboxNcsConnection {
    private failure?: SandboxTEEFailure;
    private torndown = false;
    private signerStatus: "ready" | "new-device" = "ready";

    setFailure(failure: SandboxTEEFailure | undefined): void {
        this.failure = failure;
    }

    tearDownFrame(): void {
        this.torndown = true;
    }

    // Lets a test simulate a device that hasn't completed onboarding yet, so NonCustodialSigner's
    // handleAuthRequired takes the OTP branch instead of resolving immediately as "ready".
    setSignerStatus(status: "ready" | "new-device"): void {
        this.signerStatus = status;
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
                deliver("response:get-status", this.signerStatus === "ready" ? readyStatus() : newDeviceStatus());
                return;
            }

            if (event === "request:start-onboarding" || event === "request:complete-onboarding") {
                const responseEvent =
                    event === "request:start-onboarding" ? "response:start-onboarding" : "response:complete-onboarding";
                if (this.failure === "storage-unavailable") {
                    deliver(responseEvent, { status: "error", error: "Device signer storage is unavailable" });
                    return;
                }
                if (event === "request:complete-onboarding") {
                    this.signerStatus = "ready";
                }
                deliver(responseEvent, readyStatus());
            }
        });

        return new HandshakeParent(transport, {
            incomingEvents: signerOutboundEvents,
            outgoingEvents: signerInboundEvents,
            handshakeOptions: { timeoutMs: 30_000, intervalMs: 100 },
        });
    }
}
