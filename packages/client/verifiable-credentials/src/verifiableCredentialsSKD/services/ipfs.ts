import { configManager } from "../configs";

export class IPFSService {
    gateways: string[];

    formatUrl(template: string, cid: string): string {
        return template.replace("{cid}", cid);
    }

    constructor() {
        this.gateways = configManager.getIpfsGateways();
    }

    async getFile(uri: string) {
        const httpUri = uri.replace("ipfs://", "");
        for (const gateway of this.gateways) {
            console.debug(`Trying to get file from gateway ${gateway} with uri ${httpUri}`);
            try {
                const httpUriFull = this.formatUrl(gateway, httpUri);
                const timeout = new Promise((resolve, reject) => {
                    const timeoutMilliSeconds = 5000;
                    const id = setTimeout(() => {
                        clearTimeout(id);
                        reject(`Timed out in ${timeoutMilliSeconds / 1000} seconds`);
                    }, timeoutMilliSeconds);
                });

                const response = (await Promise.race([fetch(httpUriFull), timeout])) as Response;
                if (!response.ok) {
                    throw new Error(
                        `HTTP error! status: ${response.status}, responses: ${JSON.stringify(await response.json())}`
                    );
                }

                const metadata = await response.json();
                console.debug(`Got file from gateway ${gateway} for ${uri}`);
                return metadata;
            } catch (error) {
                console.error(`Failed to get file for ${uri} with gateway ${gateway}: ${error}`);
            }
        }
    }
}
