export interface postMessageAwaitResponseConfig {
    targetOrigin?: string;
    timeoutMs?: number;
}

// Type magic to extract the return type of a condition function

type Condition<IncomingMessageData, ConditionReturn> = (
    data: IncomingMessageData
) => { shouldResolve: true; data: ConditionReturn } | undefined;

export class IFrameAdapter {
    private targetOrigin: string;
    iframe: HTMLIFrameElement;

    private constructor(url: string) {
        this.iframe = document.createElement("iframe");
        this.iframe.src = url;
        this.iframe.style.display = "none";
        document.body.appendChild(this.iframe);

        const urlObject = new URL(url);
        this.targetOrigin = urlObject.origin;
    }

    static async init(url: string): Promise<IFrameAdapter> {
        const adapter = new IFrameAdapter(url);
        const res = await new Promise<IFrameAdapter>((resolve, reject) => {
            const handShakeListener = (event: MessageEvent) => {
                const { origin, data } = event;
                if (origin !== adapter.targetOrigin) {
                    return;
                }

                if (data.type === "PAGE_LOADED") {
                    window.removeEventListener("message", handShakeListener);
                    resolve(adapter);
                }
            };

            window.addEventListener("message", handShakeListener);

            adapter.iframe.onload = () => {
                console.log("[IFrameAdapter.init] iframe loaded");
            };
            adapter.iframe.onerror = () => {
                window.removeEventListener("message", handShakeListener);
                reject("[IFrameAdapter.init] failed");
            };
        });

        return res;
    }

    async postMessageAwaitResponse<IncomingMessageData = any>(
        message: any,
        condition: (data: IncomingMessageData) => boolean,
        { timeoutMs = 10000 }: postMessageAwaitResponseConfig = {
            timeoutMs: 10000,
        }
    ): Promise<IncomingMessageData> {
        return new Promise((resolve, reject) => {
            this.postMessage(message);

            const timeoutId = setTimeout(() => {
                window.removeEventListener("message", listener);
                reject(new Error(`Timed out waiting ${timeoutMs / 1000} seconds for response from iframe`));
            }, timeoutMs);

            const listener = (event: MessageEvent<IncomingMessageData>) => {
                const { origin, data } = event;
                const isOriginAllowed = origin === this.targetOrigin;
                if (!isOriginAllowed) {
                    return;
                }

                const shouldReturn = condition(data);
                if (shouldReturn) {
                    clearTimeout(timeoutId);
                    window.removeEventListener("message", listener);
                    resolve(data);
                }
            };

            window.addEventListener("message", listener);
        });
    }

    postMessage(message: any): void {
        console.log("[IFrameAdapter.postMessage] posting message", message, "to", this.targetOrigin);
        this.iframe.contentWindow?.postMessage(message, this.targetOrigin);
    }

    unmount(): void {
        document.body.removeChild(this.iframe);
    }
}

function createCondition<IncomingMessageData, ConditionReturn>(
    fn: (data: IncomingMessageData) => { shouldResolve: true; data: ConditionReturn } | undefined
): Condition<IncomingMessageData, ConditionReturn> {
    return fn;
}

(async () => {
    const iframe = await IFrameAdapter.init("http://localhost:3000");

    const response = await iframe.postMessageAwaitResponse<{
        type: string;
        payload: any;
    }>("hello", (data) => {
        const { type, payload } = data;

        if (data === "world") {
            return true;
        } else if (data === "world2") {
            return false;
        }

        return false;
    });
})();
