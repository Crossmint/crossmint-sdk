import { AuthProvider, useAuth } from '@crossmint/client-sdk-auth-core'

export function useLoginAndCreateAA() {
    const { login, user, sendApiEventToCrossmint } = useAuth();

    async function createAAWallet() {
        if (!user) {
            throw new Error('User not logged in')
        }

        const resp = await sendApiEventToCrossmint({
            route: "/unstable/wallets/aa/wallets",
            config: {
                method: "POST",
                body: {
                    type: 'ZeroDev',
                    "smartContractWalletAddress": "0x7be8d6dD587E9EBB3e23da363144D2cF51776447",
                    "eoaAddress": "0x5dc8669b2DEE0392012CDb6867557b1C03FfA251",
                    "sessionKeySignerAddress": "0xDb6CCe7b5b8534F797b29eb9e07aFd4bf9682e03",
                    version: 0,
                    baseLayer: 'evm',
                    chainId: 80002,
                    entryPointVersion: 'v0.7'
                }
            },
        })
        console.log(resp)
    }

    /**
     * @matias idea is to modify the AA SDK a bit to replase the
     * BaseCrossmintService function with the sendApiEventToCrossmint,
     * it should be all about making that instead of using what we have there,
     * it should call to this sendApiEventToCrossmint which is async so the rest of the flow
     * can happen without any need of modification
     *
     * if this is possible, then this is epic!
     *
     *  */

    return {
        login,
        user,
        createAAWallet,
        AuthProvider
    }
}
