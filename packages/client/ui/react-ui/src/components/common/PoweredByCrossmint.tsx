import styled from "@emotion/styled";
import type { PaymentMethodManagementAppearance } from "@crossmint/client-sdk-base";
import { CrossmintLeaf } from "@/icons/crossmintLeaf";
import { theme } from "@/styles";

const PoweredByCrossmintLink = styled.a`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    margin-top: 16px;
    font-size: 12px;
    letter-spacing: -0.015em;
    text-decoration: none;
    &:hover {
        opacity: 0.75;
    }
`;

// The footer the iframe draws when `footer=host` isn't set; the SDK draws this one
// instead so it can sit below the host's own button. Same text, logo, link and the
// same two appearance variables the iframe reads, so it looks identical.
export function PoweredByCrossmint({ appearance }: { appearance?: PaymentMethodManagementAppearance }) {
    const color = appearance?.variables?.colors?.textSecondary ?? theme["cm-text-secondary"];
    // appearance.fonts cssSrc is deliberately not loaded here: it is arbitrary
    // CSS, and in the host document it could restyle the host's own controls.
    // `fontFamily` still resolves when the host already loads that font itself.
    const fontFamily = appearance?.variables?.fontFamily;
    return (
        <PoweredByCrossmintLink
            href="https://www.crossmint.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color, fontFamily }}
        >
            <CrossmintLeaf color={color} />
            <span>Powered by Crossmint</span>
        </PoweredByCrossmintLink>
    );
}
