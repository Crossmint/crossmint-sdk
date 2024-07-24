import { configManager } from "../configs";

export class IPFSService {
    gateways: string[];

    formatUrl(template: string, cid: string): string {
        if (template.endsWith("/")) {
            template = template.slice(0, -1);
        }
        return `${template}/${cid}`;
    }

    constructor() {
        this.gateways = configManager.getIpfsGateways();
    }

    async getFile(uri: string) {
        const httpUri = uri.replace("ipfs://", "");
        for (const gateway of this.gateways) {
            console.debug(`Trying to get file from gateway ${gateway} with uri ${httpUri}`);
            let timeoutId: NodeJS.Timeout = {} as NodeJS.Timeout;

            try {
                const httpUriFull = this.formatUrl(gateway, httpUri);

                const timeout = new Promise((resolve, reject) => {
                    const timeoutMilliSeconds = configManager.getIpfsTimeout();
                    timeoutId = setTimeout(() => {
                        clearTimeout(timeoutId);
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
            } catch (error: any) {
                console.error(`Failed to get file for ${uri} with gateway ${gateway}: ${error.message}`);
            } finally {
                clearTimeout(timeoutId);
            }
        }
        throw new Error(`Failed to get file for ${uri}, all gateways failed`);
    }
}
