import type { z } from "zod";
import type { CrossmintLogoColorsAndDisplayType, crossmintLogoColorsAndDisplayTypeSchema } from "./schemas";
import { CROSSMINT_LOGO_DEFAULTS, CROSSMINT_LOGO_DEFAULT_COLORS, CROSSMINT_LOGO_VIEWBOXES } from "./consts";
import { useId, type JSX } from "react";

export type CrossmintLogoV2Props = Omit<JSX.IntrinsicElements["svg"], "viewBox"> &
    z.input<typeof crossmintLogoColorsAndDisplayTypeSchema>;

export function CrossmintLogoV2({ colors, displayType = "icon-and-text", ...props }: CrossmintLogoV2Props) {
    const { icon: iconColor, text: textColor } = {
        icon: colors?.icon || CROSSMINT_LOGO_DEFAULTS.colors.icon,
        text: colors?.text || CROSSMINT_LOGO_DEFAULT_COLORS.light.text,
    };

    const colorsAndDisplayType: CrossmintLogoColorsAndDisplayType = {
        colors: { icon: iconColor, text: textColor },
        displayType,
    };

    // We must only set a default width if both width and height are not provided
    if (props.width == null && props.height == null) {
        props.width = 144;
    }

    const gradientId = useId();

    const Logo = (
        <svg viewBox={CROSSMINT_LOGO_VIEWBOXES[displayType]} {...props}>
            {getSvgGradientDefinition(colorsAndDisplayType, gradientId)}
            <g>
                <g>
                    {getSvgText(colorsAndDisplayType)}
                    {getSvgIcon(colorsAndDisplayType, gradientId)}
                </g>
            </g>
        </svg>
    );

    return Logo;
}

function getSvgGradientDefinition(props: CrossmintLogoColorsAndDisplayType, gradientId: string) {
    const { icon: iconColor } = props.colors;
    if (iconColor.type !== "gradient") {
        return null;
    }
    return (
        <defs>
            <linearGradient
                id={`logoGradient-${gradientId}`}
                className={"logoGradient"}
                x1=".1"
                y1=".1"
                x2="85.8"
                y2="85.8"
                gradientUnits="userSpaceOnUse"
            >
                <stop className={"stop-0"} offset="0" stopColor={iconColor.from} />
                <stop className={"stop-1"} offset="1" stopColor={iconColor.to} />
            </linearGradient>
        </defs>
    );
}

function getSvgText({ colors, displayType }: CrossmintLogoColorsAndDisplayType) {
    if (displayType === "icon-only") {
        return null;
    }
    const { text: textColor } = colors;
    return (
        <>
            <path
                fill={textColor}
                d="M372.7 9.5c0-3.4 2.7-6.1 6-6.1S385 6 385 9.5s-2.8 6-6.2 6-6-2.6-6-6m77.7 1.9V24h8.6v8.8h-8.6V52q-.1 5.4 5.3 5.2c1.3 0 3-.2 3.4-.3v8.2c-.6.2-2.5 1-6 1-7.7 0-12.5-4.7-12.5-12.5V33H433v-9h8.5V11.4zm-338 44.4q3 5 7.8 7.9 5 2.8 11.3 2.8 4.5 0 8.4-1.5 3.7-1.7 6.6-4.4 2.8-2.9 4-6.4l-8.9-4a10.5 10.5 0 0 1-10.1 7 11 11 0 0 1-6-1.5q-2.4-1.7-4-4.5-1.5-2.9-1.4-6.6a12 12 0 0 1 1.4-6.5q1.5-3 4-4.5a11 11 0 0 1 6-1.6q3.5 0 6.2 2 2.8 1.9 4 5l8.8-3.8q-1.2-3.9-4-6.5-2.9-2.8-6.7-4.3-3.9-1.6-8.3-1.6-6.3 0-11.3 2.8a21 21 0 0 0-7.8 7.8q-2.8 5-2.8 11.2c0 6.2 1 7.9 2.8 11.2m53-32.1h-9.4v41.9h10V42.3q0-4.8 2.7-7.4 2.5-2.7 6.9-2.7h3.6v-9H177q-4.5 0-7.6 1.9a10 10 0 0 0-3.8 4.5z"
            />
            <path
                d="M202.9 22.8c12.4 0 21.6 9.3 21.6 22s-9.1 22-21.6 22-21.5-9.2-21.5-22 9.1-22 21.5-22m0 35.2c6.1 0 11.6-4.5 11.6-13.2s-5.5-13-11.6-13-11.6 4.4-11.6 13S196.8 58 203 58"
                fillRule="evenodd"
                fill={textColor}
            />
            <path
                fill={textColor}
                d="m236.4 52-8.6 2.4c.5 4.6 5 12.5 17.1 12.5 10.6 0 15.7-7 15.7-13.3s-4.1-11-12-12.6l-6.3-1.3q-4-1-4.1-4.4c0-2.5 2.4-4.7 6-4.7 5.5 0 7.3 3.8 7.6 6.2l8.4-2.4c-.7-4.1-4.5-11.6-16-11.6-8.7 0-15.3 6.1-15.3 13.4 0 5.7 3.8 10.5 11.1 12l6.2 1.4q4.9 1.2 4.8 4.6c0 2.6-2 4.8-6.2 4.8-5.3 0-8-3.3-8.4-7m27.6 2.4 8.5-2.4c.4 3.7 3.2 7 8.5 7 4 0 6.2-2.2 6.2-4.7q.1-3.6-4.9-4.6l-6.1-1.4c-7.3-1.6-11.2-6.4-11.2-12.1 0-7.2 6.7-13.4 15.3-13.4 11.6 0 15.3 7.5 16 11.6l-8.4 2.4c-.3-2.4-2-6.2-7.6-6.2-3.5 0-6 2.2-6 4.7q.2 3.5 4.2 4.4l6.3 1.3c7.8 1.7 12 6.5 12 12.6s-5.2 13.3-15.8 13.3c-12 0-16.6-7.8-17-12.5m48.6-30.7h-9.5v41.9h10.1V41q0-2.7 1-4.8a8 8 0 0 1 7-4.2 8 8 0 0 1 7.2 4.2q1 2.1 1 4.8v24.6h10.1V41q0-2.7 1-4.8a8 8 0 0 1 7-4.2q2.6 0 4.4 1.2 1.8 1 2.8 3 1 2.1 1 4.8v24.6h10v-27q0-4.5-2-8.2a14 14 0 0 0-5.5-5.6q-3.5-2-8-2-5 0-8.8 2.5-2.4 1.6-4.1 4.2-1.4-2.3-3.9-4a16 16 0 0 0-9-2.7q-4.8 0-8.3 2.2-2.2 1.5-3.5 4zm71.1 41.9h-9.8V24.1h9.8zm8.8-41.6v41.6h10V41.3q0-2.8 1.1-4.8a8 8 0 0 1 7.3-4.2 8 8 0 0 1 7.4 4.2q1 2 1 4.7v24.4h10V38.9q0-4.6-2-8.2a14 14 0 0 0-5.5-5.6q-3.4-2-8.1-2c-4.7 0-5.5.7-7.8 2q-2.5 1.6-4 4v-5z"
            />
        </>
    );
}

function getSvgIcon(props: CrossmintLogoColorsAndDisplayType, gradientId: string) {
    const { icon: iconColor } = props.colors;
    return (
        <path
            d="M70 48.3A62 62 0 0 0 47.5 43c7.7-.6 22.8-2.7 29-10.4C86.6 25.2 86 .3 86 .3S62.3-2.4 52 9.4c-6.5 6.4-8.4 17.5-9 25.2-.6-7.7-2.6-18.8-9-25.2C23.7-2.4 0 .3 0 .3S-.3 15.8 4.4 26C6.8 31 11 35.1 16 37.6c7.2 3.7 16.8 5 22.4 5.4-5.6.4-15.2 1.7-22.4 5.3C11 51 6.8 55 4.4 60-.3 70.2 0 85.7 0 85.7s23.7 2.6 34-9.2c6.4-6.3 8.4-17.5 9-25.2.6 7.8 2.6 18.9 9 25.3 10.3 11.7 34 9.1 34 9.1s.3-15.6-4.5-25.7A25 25 0 0 0 70 48.3m.8 21.9c-.1 0-12.5-3.6-28.3-24.7A195 195 0 0 0 15 71.8l-.5.6.2-.8c0-.1 3.7-12.8 25.7-29C38.3 39.4 33.3 32.2 14 15l-.4-.4.6.1c.4 0 10.3 1.6 28.5 25l.6 1c2.6-1.8 10-7.1 26.7-26l.4-.4-.1.6c0 .4-1.6 10.3-24.9 28.4A193 193 0 0 0 71 69.9l.6.5z"
            fill={iconColor.type === "gradient" ? `url(#logoGradient-${gradientId})` : iconColor.color}
            fillRule="evenodd"
        />
    );
}
