// A passkey that is a quorum member needs the passkey provider as much as a top-level one.
export function includesPasskeySigner(signers: ReadonlyArray<{ type: string; members?: unknown }> = []): boolean {
    return signers.some(
        (signer) =>
            signer.type === "passkey" ||
            (Array.isArray(signer.members) &&
                signer.members.some((member: { type?: unknown } | null) => member?.type === "passkey"))
    );
}
