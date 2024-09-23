import { PoweredByLeaf } from "@/icons/poweredByLeaf";
import { classNames } from "@/utils/classNames";

export function PoweredByCrossmint({ className }: { className?: string }) {
    return (
        <p className={classNames("flex text-xs text-[#67797F] font-normal -tracking-[0.9px] p-2", className)}>
            Powered by
            <span className="self-center pr-1 pl-1.5">
                <PoweredByLeaf color="#67797F" />
            </span>
            crossmint
        </p>
    );
}
