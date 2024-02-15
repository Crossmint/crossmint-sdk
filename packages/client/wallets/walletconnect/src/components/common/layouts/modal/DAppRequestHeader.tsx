import { useCrossmintWalletConnect } from "../../../../hooks/useCrossmintWalletConnect";

export type RequesterMetadata = {
    name: string;
    url: string;
    icon: string;
};

export type DAppRequestHeaderProps = {
    requesterMetadata: RequesterMetadata;
    message: string;
};

export default function DAppRequestHeader({ requesterMetadata, message }: DAppRequestHeaderProps) {
    const { uiConfig } = useCrossmintWalletConnect();

    return (
        <div className="flex flex-col items-center justify-start">
            <div className="flex items-center -space-x-4">
                <img
                    src={requesterMetadata.icon}
                    alt={requesterMetadata.name}
                    className="rounded-full w-14 h-14"
                    style={{
                        border: `2px solid ${uiConfig.colors.backgroundSecondary}`,
                    }}
                />
                <img
                    src={uiConfig.metadata.icon}
                    alt={uiConfig.metadata.name}
                    className="rounded-full w-14 h-14"
                    style={{
                        border: `2px solid ${uiConfig.colors.backgroundSecondary}`,
                    }}
                />
            </div>

            <h2 className="px-2 mt-4 text-lg font-medium leading-snug tracking-tight text-center">
                <a
                    className="transition-opacity duration-150 hover:opacity-60"
                    style={{ color: uiConfig.colors.textLink }}
                    href={requesterMetadata.url}
                    target="_blank"
                    rel="noreferrer"
                >
                    {requesterMetadata.name}{" "}
                </a>
                {message}
            </h2>

            <div className="w-full px-6 overflow-hidden text-center">
                <p
                    className="mt-1 text-xs truncate"
                    style={{
                        color: uiConfig.colors.textSecondary,
                    }}
                >
                    {requesterMetadata.url}
                </p>
            </div>
        </div>
    );
}
