import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import type { CSSProperties } from "react";
import type { PaymentMethodManagementAppearance } from "@crossmint/client-sdk-base";

// The iframe's defaults (light theme) and layout: number, expiry and CVC, name, then the
// iframe's 24px feedback row. Keep in sync with the add-card form in the iframe.
const DEFAULT_SPACING_UNIT = `${10 / 3}px`;
const DEFAULT_FONT_SIZE_UNIT = "4px";
const DEFAULT_BORDER_RADIUS = "12px";
const DEFAULT_BORDER = "#D1D5DB";
const DEFAULT_BACKGROUND = "#ffffff";
const DEFAULT_TEXT = "#000000";
const FIELD_GAP = 12;
const FEEDBACK_HEIGHT = 24;

const pulse = keyframes`
    0%, 100% {
        opacity: 0.1;
    }
    50% {
        opacity: 0.04;
    }
`;

// A tint of the text colour over the field's own background, so the fields read as loading on
// any theme instead of as an empty form.
const Field = styled.div`
    position: relative;
    box-sizing: border-box;
    width: 100%;
    overflow: hidden;
    &::after {
        content: "";
        position: absolute;
        inset: 0;
        background-color: currentColor;
        opacity: 0.07;
        animation: ${pulse} 2s ease-in-out infinite;
        @media (prefers-reduced-motion: reduce) {
            animation: none;
        }
    }
`;

/** Empty fields where the iframe's card form will be, styled from the same appearance, while it loads. */
export function CardFormSkeleton({ appearance }: { appearance?: PaymentMethodManagementAppearance }) {
    const variables = appearance?.variables;
    const input = appearance?.rules?.Input;
    const spacingUnit = variables?.spacingUnit ?? DEFAULT_SPACING_UNIT;
    const fontSize = input?.font?.size ?? `calc(${variables?.fontSizeUnit ?? DEFAULT_FONT_SIZE_UNIT} * 4)`;
    // The iframe's field: 1px borders, `spacingUnit * 4.3` padding around a line of 1.2 × the font size.
    const field: CSSProperties = {
        height: `calc(${spacingUnit} * 8.6 + ${fontSize} * 1.2 + 2px)`,
        borderRadius: input?.borderRadius ?? variables?.borderRadius ?? DEFAULT_BORDER_RADIUS,
        border: `1px solid ${input?.colors?.border ?? variables?.colors?.borderPrimary ?? DEFAULT_BORDER}`,
        backgroundColor: input?.colors?.background ?? variables?.colors?.backgroundPrimary ?? DEFAULT_BACKGROUND,
        color: input?.colors?.text ?? variables?.colors?.textPrimary ?? DEFAULT_TEXT,
    };
    return (
        <div
            aria-hidden="true"
            data-testid="crossmint-payment-method-management.skeleton"
            style={{ display: "flex", flexDirection: "column", rowGap: FIELD_GAP, paddingBottom: FEEDBACK_HEIGHT }}
        >
            <Field style={field} />
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(105px, 1fr))",
                    gap: FIELD_GAP,
                }}
            >
                <Field style={field} />
                <Field style={field} />
            </div>
            <Field style={field} />
        </div>
    );
}
