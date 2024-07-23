import { ethers } from "ethers";

declare global {
    interface Window {
        ethereum?: any;
    }
}

export class MetamaskService {
    private provider: ethers.providers.Web3Provider | null = null;
    accounts: string[] = [];

    private async connectMetaMask(): Promise<[ethers.providers.Web3Provider, string[]]> {
        if (typeof window.ethereum !== "undefined") {
            await window.ethereum.request({ method: "eth_requestAccounts" });
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const accounts = await provider.listAccounts();
            return [provider, accounts];
        } else {
            throw new Error("MetaMask is not installed!");
        }
    }

    async metamaskSignMessage(account: string, message: string): Promise<string> {
        if (this.provider === null || this.accounts.length === 0) {
            const [provider, accounts] = await this.connectMetaMask();
            this.provider = provider;
            this.accounts = accounts;
        }

        if (!this.accounts.includes(account)) {
            throw new Error(`Account ${account} is not available in MetaMask.`);
        }

        const signer = this.provider.getSigner(account);
        const signature = await signer.signMessage(message);
        return signature;
    }

    async getConnectedWallet(refresh = false): Promise<string> {
        if (this.provider === null || this.accounts.length === 0 || refresh) {
            const [provider, accounts] = await this.connectMetaMask();
            this.provider = provider;
            this.accounts = accounts;
        }

        return this.accounts[0];
    }
}
