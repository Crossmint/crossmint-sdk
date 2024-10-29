import { PoweredByLeaf } from "@/icons/poweredByLeaf";
import { classNames } from "@/utils/classNames";

export function PoweredByCrossmint({ color = "#A4AFB2", className }: { color?: string; className?: string }) {
    return (
        <p className={classNames("flex", className)}>
            <PoweredByLeaf color={color} />
        </p>
    );
}
