import { useCallback, useMemo } from "react";
import type { Address } from "viem";
import type { WebAuthnP256 } from "ox";
import type { PasskeySigner } from "@crossmint/client-sdk-smart-wallet";

type WalletCache = {
    wallet?: {
        address: Address;
        initialized?: boolean;
    };
    passkey?: {
        authenticatorId: string;
        domain: string;
        passkeyName: string;
        pubKeyPrefix: number;
        pubKeyX: string;
        pubKeyY: string;
    };
};

export function useWalletCache(userId: string | undefined) {
    const getCache = useCallback((): WalletCache | null => {
        if (userId == undefined) {
            return null;
        }
        const key = `smart-wallet-${userId}`;
        const cache = localStorage.getItem(key);
        if (cache == null) {
            return null;
        }
        return JSON.parse(cache) as WalletCache;
    }, [userId]);

    const setCache = useCallback(
        (newCache: WalletCache) => {
            if (userId == undefined) {
                return;
            }
            const key = `smart-wallet-${userId}`;
            localStorage.setItem(key, JSON.stringify(newCache));
        },
        [userId]
    );

    const setWalletAddress = useCallback(
        (address: Address) => {
            const currentCache = getCache() || {};
            setCache({
                ...currentCache,
                wallet: {
                    ...currentCache.wallet,
                    address,
                },
            });
        },
        [getCache, setCache]
    );

    const isWalletInitialized = useMemo((): boolean => {
        const cache = getCache();
        if (cache == null) {
            return false;
        }
        return cache.wallet?.initialized ?? false;
    }, [getCache]);

    const setWalletInitialized = useCallback(
        (initialized: boolean) => {
            const currentCache = getCache();
            if (currentCache === null || currentCache.wallet === undefined) {
                return;
            }
            setCache({
                ...currentCache,
                wallet: {
                    ...currentCache.wallet,
                    initialized,
                },
            });
        },
        [getCache, setCache]
    );

    const passkey = useMemo(() => {
        const cache = getCache();
        if (cache === null || cache.passkey === undefined) {
            return undefined;
        }
        return {
            type: "PASSKEY",
            credential: {
                id: cache.passkey.authenticatorId,
                publicKey: {
                    prefix: cache.passkey.pubKeyPrefix,
                    x: BigInt(cache.passkey.pubKeyX),
                    y: BigInt(cache.passkey.pubKeyY),
                },
            } as WebAuthnP256.P256Credential,
        } as PasskeySigner;
    }, [getCache]);

    const setPasskey = useCallback(
        (passkeySigner: PasskeySigner) => {
            const currentCache = getCache() || {};
            setCache({
                ...currentCache,
                passkey: {
                    authenticatorId: passkeySigner.credential.id,
                    domain: "localhost",
                    passkeyName: "Crossmint Wallet",
                    pubKeyPrefix: passkeySigner.credential.publicKey.prefix,
                    pubKeyX: passkeySigner.credential.publicKey.x.toString(),
                    pubKeyY: passkeySigner.credential.publicKey.y.toString(),
                },
            });
        },
        [getCache, setCache]
    );

    return {
        setWalletAddress,
        isWalletInitialized,
        setWalletInitialized,
        passkey,
        setPasskey,
    };
}
