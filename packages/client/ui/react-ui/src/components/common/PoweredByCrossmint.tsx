import { PoweredByLeaf } from "@/icons/poweredByLeaf";
import { classNames } from "@/utils/classNames";

export function PoweredByCrossmint({ color, className }: { color?: string; className?: string }) {
    return (
        <p
            className={classNames("flex text-[13px] mt-4 font-semibold items-center", className)}
            style={{ color: color || "#A4AFB2" }}
        >
            <span className="flex self-center pr-1.5 gap-1 items-center font-semibold">
                <PoweredByLeaf color={color ?? "#A4AFB2"} />
            </span>
            Powered by Crossmint
        </p>
    );
}
