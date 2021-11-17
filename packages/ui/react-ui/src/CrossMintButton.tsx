import React, { CSSProperties, FC, MouseEvent, MouseEventHandler, useMemo, useCallback } from 'react';
import { useCrossMintPopup } from './useCrossMintPopup';

interface ButtonProps {
    candyMachineId: string;
    className?: string;
    disabled?: boolean;
    onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
    style?: CSSProperties;
    tabIndex?: number;
    theme?: 'light' | 'dark' | 'colored';
}

export const CrossMintButton: FC<ButtonProps> = ({
    candyMachineId,
    className,
    disabled,
    onClick,
    style,
    tabIndex,
    theme = 'colored',
    ...props
}) => {
    const { connecting, connect } = useCrossMintPopup();

    const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
        (event) => {
            if (onClick) onClick(event);

            if (!event.defaultPrevented) connect(candyMachineId);
        },
        [onClick]
    );

    const content = useMemo(() => {
        if (connecting) return 'Connecting ...';
        return <p>Pay with CrossMint</p>;
    }, []);

    return (
        <button
            className={`mint-adapter-button-trigger mint-adapter-button-trigger-${theme}`}
            disabled={disabled}
            onClick={handleClick}
            style={{ ...style }}
            tabIndex={tabIndex}
            {...props}
        >
            {content}
        </button>
    );
};
