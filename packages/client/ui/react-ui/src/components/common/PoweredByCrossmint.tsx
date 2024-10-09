import { PoweredByLeaf } from "@/icons/poweredByLeaf";

export function PoweredByCrossmint({ color }: { color?: string }) {
    return (
        <p
            style={{
                display: "flex",
                fontSize: "0.75rem",
                fontWeight: "400",
                letterSpacing: "-0.2px",
                padding: "0.5rem",
                color: color || "#67797F",
            }}
        >
            Powered by
            <span className="flex self-center pl-1 gap-1 items-center font-semibold">
                <PoweredByLeaf color={color ?? "#67797F"} size={"12"} />
                <span>crossmint</span>
            </span>
        </p>
    );
}
