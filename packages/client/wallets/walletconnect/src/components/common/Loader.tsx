import { useCrossmintWalletConnect } from "@/hooks/useCrossmintWalletConnect";

interface Loader {
    size?: number;
    className?: string;
    color?: string;
}

export default function Loader({ color, size, className }: Loader) {
    const { uiConfig } = useCrossmintWalletConnect();
    return (
        <span className="animate-fade">
            <div
                style={{
                    borderColor: color || uiConfig.colors.accent,
                }}
                className={`!border-t-transparent ${
                    size ? `w-${size} h-${size}` : "w-6 h-6"
                } border-2 border-solid rounded-full animate-spin ${className ? className : ""}`}
            />
        </span>
    );
}
