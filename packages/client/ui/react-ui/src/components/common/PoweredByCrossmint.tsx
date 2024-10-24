import { PoweredByLeaf } from "@/icons/poweredByLeaf";
import { classNames } from "@/utils/classNames";

export function PoweredByCrossmint({ color, className }: { color?: string; className?: string }) {
    return (
        <p
            className={classNames("flex text-xs font-normal tracking-tight p-2 items-center", className)}
            style={{ color: color || "#67797F" }}
        >
            Powered by
            <span className="flex self-center pl-1 gap-1 items-center font-semibold">
                <PoweredByLeaf color={color ?? "#67797F"} size={"12"} />
                <span>crossmint</span>
            </span>
        </p>
    );
}
