import { CSSProperties, MouseEvent } from "react";

import { CrossmintVerificationButtonProps, crossmintVerificationService } from "@crossmint/client-sdk-base";
import { PopupWindow } from "@crossmint/client-sdk-window";

import { formatProps, useStyles } from "./styles";

export type CrossmintVerificationButtonReactProps = CrossmintVerificationButtonProps & {
    onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
    style?: CSSProperties;
    children?: React.ReactNode;
    className?: string;
};

export function CrossmintVerificationButton(props: CrossmintVerificationButtonReactProps) {
    const { getUrl } = crossmintVerificationService({
        collectionId: props.collectionId,
        scopes: props.scopes,
        environment: props.environment,
        fields: props.fields,
    });

    // TODO: Do we want to support themes?
    const classes = useStyles(formatProps("dark"));

    async function onClick() {
        PopupWindow.init(getUrl(), { width: 400, height: 666 });
    }

    return (
        <button
            onClick={onClick}
            className={`${classes.crossmintButton} ${props.className || ""}`}
            style={{ ...props.style }}
        >
            <img
                className={classes.crossmintImg}
                src="https://www.crossmint.io/assets/crossmint/logo.svg"
                alt="Crossmint logo"
            />
            {props.children}
        </button>
    );
}
