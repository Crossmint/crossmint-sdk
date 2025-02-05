import { CrossmintCheckoutProvider, CrossmintProvider } from "@crossmint/client-sdk-react-ui";
import type { ReactNode } from "react";

export function EmbeddedCheckoutV3ClientProviders({ children }: { children: ReactNode }) {
    return (
        <CrossmintProvider
            overrideBaseUrl="https://dserver.maxf.io"
            apiKey="ck_development_257BPZjTvadJR4AtJf8dWvkw5et52WsPpTcPmBGrrcqKGXmisRmCsa6Fazp5eNgESyQ2VUs9WtFzGk3tqLLBF52PY7XLhKytKMBgxgcRj9p5Q8w8pnUqM1JYrpU6hFivtsxx11qSRkJmXhyKJPYyy7GYpUSFzfoxhosTU1d3JSuKiJdtJY6nViCBdcWCkpm7iAQpCMdV4BU3RxR3pAN9Syw"
        >
            <CrossmintCheckoutProvider>{children}</CrossmintCheckoutProvider>
        </CrossmintProvider>
    );
}
