import { p256 } from "@noble/curves/p256";
import { sha256 } from "@noble/hashes/sha256";
import { describe, expect, it } from "vitest";
import {
    base64UrlToBytes,
    bytesToBase64Url,
    hexChallengeToBase64Url,
    publicKeyFromRegistration,
    toPasskeySignResult,
    utf8Decode,
} from "./webauthn";

const SPKI_P256_HEADER = Uint8Array.from(
    "3059301306072a8648ce3d020106082a8648ce3d030107034200".match(/../g)!.map((byte) => Number.parseInt(byte, 16))
);

function concat(...parts: Uint8Array[]): Uint8Array {
    const out = new Uint8Array(parts.reduce((length, part) => length + part.length, 0));
    let offset = 0;
    for (const part of parts) {
        out.set(part, offset);
        offset += part.length;
    }
    return out;
}

/** CBOR head for lengths below 256, enough for these fixtures. */
function cborHead(majorType: number, value: number): Uint8Array {
    return value < 24 ? Uint8Array.of((majorType << 5) | value) : Uint8Array.of((majorType << 5) | 24, value);
}
const cborInt = (value: number) => (value >= 0 ? cborHead(0, value) : cborHead(1, -1 - value));
const cborBytes = (bytes: Uint8Array) => concat(cborHead(2, bytes.length), bytes);
const cborText = (text: string) => concat(cborHead(3, text.length), new TextEncoder().encode(text));

/** A software P-256 authenticator producing what native passkey APIs return. */
function softwarePasskey() {
    const privateKey = p256.utils.randomPrivateKey();
    const point = p256.getPublicKey(privateKey, false);
    const x = point.slice(1, 33);
    const y = point.slice(33);
    const affine = p256.ProjectivePoint.fromHex(point).toAffine();
    const credentialId = Uint8Array.from({ length: 16 }, (_, i) => i + 1);

    const coseKey = concat(
        cborHead(5, 5),
        cborInt(1),
        cborInt(2), // kty: EC2
        cborInt(3),
        cborInt(-7), // alg: ES256
        cborInt(-1),
        cborInt(1), // crv: P-256
        cborInt(-2),
        cborBytes(x),
        cborInt(-3),
        cborBytes(y)
    );
    const registrationAuthData = concat(
        new Uint8Array(32).fill(7),
        Uint8Array.of(0x45), // UP | UV | AT
        new Uint8Array(4),
        new Uint8Array(16),
        Uint8Array.of(0, credentialId.length),
        credentialId,
        coseKey
    );
    const attestationObject = concat(
        cborHead(5, 3),
        cborText("fmt"),
        cborText("none"),
        cborText("attStmt"),
        cborHead(5, 0),
        cborText("authData"),
        cborBytes(registrationAuthData)
    );

    function assert(challenge: Uint8Array, { highS = false } = {}) {
        const authenticatorData = concat(new Uint8Array(32).fill(7), Uint8Array.of(0x05), Uint8Array.of(0, 0, 0, 1));
        const clientDataJSON = JSON.stringify({
            type: "webauthn.get",
            challenge: bytesToBase64Url(challenge),
            origin: "android:apk-key-hash:é-test",
        });
        const clientDataBytes = new TextEncoder().encode(clientDataJSON);
        const payload = concat(authenticatorData, sha256(clientDataBytes));
        const lowS = p256.sign(sha256(payload), privateKey, { lowS: true });
        const signature = highS ? new p256.Signature(lowS.r, p256.CURVE.n - lowS.s) : lowS;
        return {
            payload,
            clientDataJSON,
            response: {
                authenticatorData: bytesToBase64Url(authenticatorData),
                clientDataJSON: bytesToBase64Url(clientDataBytes),
                signature: bytesToBase64Url(signature.toDERRawBytes()),
            },
        };
    }

    return {
        point,
        expected: { x: affine.x.toString(), y: affine.y.toString() },
        spki: bytesToBase64Url(concat(SPKI_P256_HEADER, point)),
        attestationObject: bytesToBase64Url(attestationObject),
        assert,
    };
}

describe("base64url", () => {
    it("round-trips bytes of every length", () => {
        for (let length = 0; length < 8; length++) {
            const bytes = Uint8Array.from({ length }, (_, i) => (i * 37 + 251) % 256);
            expect(base64UrlToBytes(bytesToBase64Url(bytes))).toEqual(bytes);
        }
    });

    it("decodes standard base64 with padding too", () => {
        expect(base64UrlToBytes("+/8=")).toEqual(Uint8Array.of(0xfb, 0xff));
        expect(base64UrlToBytes("-_8")).toEqual(Uint8Array.of(0xfb, 0xff));
    });

    it("turns the SDK's hex challenge into the base64url WebAuthn expects", () => {
        expect(hexChallengeToBase64Url(`0x${"ab".repeat(32)}`)).toBe(bytesToBase64Url(new Uint8Array(32).fill(0xab)));
        expect(() => hexChallengeToBase64Url("0xabc")).toThrow("hex");
    });
});

describe("utf8Decode", () => {
    it("decodes multi-byte characters", () => {
        const text = 'é – 🔑 {"type":"webauthn.get"}';
        expect(utf8Decode(new TextEncoder().encode(text))).toBe(text);
    });
});

describe("publicKeyFromRegistration", () => {
    const passkey = softwarePasskey();

    it("reads the key from the SPKI publicKey", () => {
        expect(publicKeyFromRegistration({ publicKey: passkey.spki, attestationObject: "" })).toEqual(passkey.expected);
    });

    it("reads the key from the attestationObject when there is no publicKey", () => {
        expect(publicKeyFromRegistration({ attestationObject: passkey.attestationObject })).toEqual(passkey.expected);
    });

    it("rejects a point that is not on P-256", () => {
        const offCurve = new Uint8Array(passkey.point);
        offCurve[64] ^= 1;
        expect(() =>
            publicKeyFromRegistration({
                publicKey: bytesToBase64Url(concat(SPKI_P256_HEADER, offCurve)),
                attestationObject: "",
            })
        ).toThrow();
    });
});

describe("toPasskeySignResult", () => {
    const passkey = softwarePasskey();
    const challenge = new Uint8Array(32).fill(0xab);

    it.each([false, true])("returns a low-S signature that verifies (high-S DER: %s)", (highS) => {
        const assertion = passkey.assert(challenge, { highS });

        const { signature } = toPasskeySignResult(assertion.response);

        const s = BigInt(signature.s);
        expect(s <= p256.CURVE.n / BigInt(2)).toBe(true);
        expect(
            p256.verify(
                new p256.Signature(BigInt(signature.r), s).toCompactRawBytes(),
                sha256(assertion.payload),
                passkey.point,
                { lowS: true }
            )
        ).toBe(true);
    });

    it("returns the metadata ox produces: hex authenticatorData, the decoded clientDataJSON and its indices", () => {
        const assertion = passkey.assert(challenge);

        const { metadata } = toPasskeySignResult(assertion.response);

        expect(metadata).toEqual({
            authenticatorData: `0x${"07".repeat(32)}0500000001`,
            clientDataJSON: assertion.clientDataJSON,
            challengeIndex: assertion.clientDataJSON.indexOf('"challenge"'),
            typeIndex: assertion.clientDataJSON.indexOf('"type"'),
            userVerificationRequired: true,
        });
    });
});
