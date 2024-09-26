import { PoweredByLeaf } from "@/icons/poweredByLeaf";
import { classNames } from "@/utils/classNames";

export function PoweredByCrossmint({ color }: { color?: string }) {
    return (
        <p
            className={classNames(
                "flex text-xs font-normal -tracking-[0.2px] p-2",
                color ? `text-[${color}]` : "text-[#67797F]"
            )}
        >
            Powered by
            <span className="flex self-center pl-1 gap-1 items-center font-semibold">
                <PoweredByLeaf color={color ?? "#67797F"} size={"12"} />
                <span>crossmint</span>
            </span>
        </p>
    );
}
