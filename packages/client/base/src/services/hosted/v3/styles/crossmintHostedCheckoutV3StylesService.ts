import type { Locale } from "@/types";
import type {
    CrossmintHostedCheckoutV3ButtonTheme,
    CrossmintHostedCheckoutV3Props,
} from "@/types/hosted/v3/CrossmintHostedCheckoutV3Props";
import { t } from "@/utils/i18n";

const BUTTON_CLASSNAME = "CrossmintHostedCheckoutButton";
const BUTTON_LOGO_ID = "CrossmintHostedCheckoutLogo";

const BUTTON_THEME_TO_CLASSNAME: Record<CrossmintHostedCheckoutV3ButtonTheme, string> = {
    light: `${BUTTON_CLASSNAME}--Light`,
    dark: `${BUTTON_CLASSNAME}--Dark`,
    crossmint: `${BUTTON_CLASSNAME}--Crossmint`,
};

export function crossmintHostedCheckoutV3StylesService(hostedCheckoutProps: CrossmintHostedCheckoutV3Props) {
    const buttonTheme = hostedCheckoutProps.appearance?.theme?.button || "dark";

    function generateCss() {
        return [generateFontCss(), generateButtonCss()].join("\n");
    }

    function generateFontCss() {
        return `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');`;
    }

    function generateButtonCss() {
        return [generateButtonCommonCss(), generateButtonSpecificCss()].join("\n");
    }

    function generateButtonCommonCss() {
        return `.${BUTTON_CLASSNAME} {
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Inter;
            font-size: 16px;
            font-weight: 600;
            letter-spacing: -0.015em;
            padding: 14px 24px;
            border-radius: 12px;
            border: none;
            outline: none;
            cursor: pointer;
            transition: background 0.15s ease, border 0.15s ease, box-shadow 0.15s ease, color 0.15s ease;
        }`;
    }

    function generateButtonSpecificCss() {
        const buttonThemeSpecificAppearance: Record<CrossmintHostedCheckoutV3ButtonTheme, { css: string }> = {
            light: {
                css: `.${BUTTON_THEME_TO_CLASSNAME[buttonTheme]} {
                background-color: #FFFFFF;
                color: #000000;
                }
                .${BUTTON_THEME_TO_CLASSNAME[buttonTheme]}:hover:enabled {
                    background-color: #e8e8e8;
                }
                `,
            },
            dark: {
                css: `.${BUTTON_THEME_TO_CLASSNAME[buttonTheme]} {
                background-color: #000000;
                color: #FFFFFF;
                }
                .${BUTTON_THEME_TO_CLASSNAME[buttonTheme]}:hover:enabled {
                    background-color: #3C4043;
                }
                .${BUTTON_THEME_TO_CLASSNAME[buttonTheme]} #${BUTTON_LOGO_ID} .logoGradient .stop-0 {
                    stop-color: #00FF85;
                }
                .${BUTTON_THEME_TO_CLASSNAME[buttonTheme]} #${BUTTON_LOGO_ID} .logoGradient .stop-1 {
                    stop-color: #00E0FF;
                }
                `,
            },
            crossmint: {
                css: `.${BUTTON_THEME_TO_CLASSNAME[buttonTheme]} {
                background-color: #05B959;
                color: #FFFFFF;
                }
                .${BUTTON_THEME_TO_CLASSNAME[buttonTheme]}:hover:enabled {
                    background-color: #0BAF5C;
                }
                .${BUTTON_THEME_TO_CLASSNAME[buttonTheme]} #${BUTTON_LOGO_ID} .logoGradient .stop-0 {
                    stop-color: currentColor;
                }
                .${BUTTON_THEME_TO_CLASSNAME[buttonTheme]} #${BUTTON_LOGO_ID} .logoGradient .stop-1 {
                    stop-color: currentColor;
                }
                `,
            },
        };
        return buttonThemeSpecificAppearance[buttonTheme].css;
    }

    function injectCss(css: string) {
        const style = document.createElement("style");
        style.innerHTML = css;
        document.head.appendChild(style);
        return {
            cleanup: () => {
                document.head.removeChild(style);
            },
        };
    }

    function getButtonText() {
        const locale: Locale = hostedCheckoutProps.locale || "en-US";

        const isCryptoEnabled = hostedCheckoutProps.payment?.crypto?.enabled;
        const isFiatEnabled = hostedCheckoutProps.payment?.fiat?.enabled;

        const paymentMethodText = (() => {
            if (isCryptoEnabled && isFiatEnabled) {
                return t("hostedCheckoutV3.crossmint", locale);
            }
            if (isCryptoEnabled) {
                return t("hostedCheckoutV3.crypto", locale);
            }
            if (isFiatEnabled) {
                return t("hostedCheckoutV3.card", locale);
            }
            throw new Error("Neither `payment.crypto.enabled` or `payment.fiat.enabled` is true");
        })();

        return t(`hostedCheckoutV3.paymentVariant.pay`, locale, [paymentMethodText]);
    }

    return {
        identifiers: {
            buttonClassNames: `${BUTTON_CLASSNAME} ${BUTTON_THEME_TO_CLASSNAME[buttonTheme]}`,
            logoId: BUTTON_LOGO_ID,
        },
        getButtonText,
        generateCss,
        injectCss,
    };
}
