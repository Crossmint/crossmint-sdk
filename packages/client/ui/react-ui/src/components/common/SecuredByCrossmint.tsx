import { SecuredByLeaf } from "@/icons/securedByLeaf";
import { classNames } from "@/utils/classNames";

export function SecuredByCrossmint({ color = "#67797F", className }: { color?: string; className?: string }) {
    return (
        <div className={classNames("flex", className)}>
            <SecuredByLeaf color={color} />
        </div>
    );
}
