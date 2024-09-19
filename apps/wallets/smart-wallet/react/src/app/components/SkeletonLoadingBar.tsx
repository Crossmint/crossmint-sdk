import { type CrossmintElementProps, classNames } from "../utils/uiUtils";

export default function SkeletonLoadingBar({ className, children, ...props }: CrossmintElementProps) {
    const loadingAnimation = "bg-gradient-to-tr from-[#D0D0D0] to-[#F2F3F7] bg-opacity-50 animate-pulse";

    const classes = classNames("rounded-md", className, loadingAnimation);
    return <div className={classes} {...props} />;
}
