import { SecuredByLeaf } from "@/icons/securedByLeaf";
import { classNames } from "@/utils/classNames";

export function SecuredByCrossmint({ color = "#A4AFB2", className }: { color?: string; className?: string }) {
    return (
        <p className={classNames("flex", className)}>
            <SecuredByLeaf color={color} />
        </p>
    );
}
