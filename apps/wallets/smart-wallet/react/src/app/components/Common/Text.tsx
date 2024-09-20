import type { AProps, PProps } from "react-html-props";

import { type CrossmintElementProps, classNames } from "../../utils/uiUtils";
import { getTarget } from "../../utils/urls";

export const PrimaryTitle = ({ className, children, ...props }: CrossmintElementProps<PProps>) => (
    <h1 className={`font-bold text-custom-text-primary text-2xl ${className || ""}`} {...props}>
        {children}
    </h1>
);
export const SecondaryTitle = ({ className, children, ...props }: CrossmintElementProps<PProps>) => {
    const classes = classNames("mb-10", className);
    return (
        <MarginLessSecondaryTitle className={classes} {...props}>
            {children}
        </MarginLessSecondaryTitle>
    );
};

export const MarginLessSecondaryTitle = ({ className, children, ...props }: CrossmintElementProps<PProps>) => (
    <h2 className={`font-semibold text-xl text-custom-text-primary ${className || ""}`} {...props}>
        {children}
    </h2>
);

export const TerciaryTitle = ({ className, children, ...props }: CrossmintElementProps<PProps>) => (
    <h3 className={`font-semibold text-custom-text-primary text-base mb-3 ${className || ""}`} {...props}>
        {children}
    </h3>
);

export const Paragraph = ({ className, children, ...props }: CrossmintElementProps<PProps>) => (
    <p className={classNames("text-custom-text-secondary text-sm", className)} {...props}>
        {children}
    </p>
);

export const ParagraphBold = ({ className, children, ...props }: CrossmintElementProps<PProps>) => (
    <Paragraph className={`text-custom-text-primary font-bold ${className || ""}`} {...props}>
        {children}
    </Paragraph>
);

export const Caption = ({ className, children, ...props }: CrossmintElementProps<PProps>) => (
    <Paragraph className={`text-xs ${className || ""}`} {...props}>
        {children}
    </Paragraph>
);

export const CaptionBold = ({ className, children, ...props }: CrossmintElementProps<PProps>) => (
    <ParagraphBold className={`text-xs ${className || ""}`} {...props}>
        {children}
    </ParagraphBold>
);

export const ModalTitle = ({ className, children, ...props }: CrossmintElementProps<PProps>) => (
    <h1 className={`font-semibold text-[24px] leading-7 ${className || ""}`} {...props}>
        {children}
    </h1>
);

export const BodyText = ({ className, children, ...props }: CrossmintElementProps<PProps>) => (
    <p className={`text-[15px] leading-5 ${className || ""}`} {...props}>
        {children}
    </p>
);

export const SecondaryText = ({ className, children, ...props }: CrossmintElementProps<PProps>) => (
    <p className={`text-[14px] leading-5 ${className || ""}`} {...props}>
        {children}
    </p>
);

export const Link = ({
    className,
    children,
    disabled,
    target,
    ...props
}: CrossmintElementProps<AProps> & { disabled?: boolean }) => (
    <a
        target={getTarget(props.href, target)}
        className={classNames(
            "text-link underline underline-offset-1 text-sm",
            disabled ? "opacity-50 pointer-events-none cursor-not-allowed" : "",
            className
        )}
        {...props}
    >
        {children}
    </a>
);
