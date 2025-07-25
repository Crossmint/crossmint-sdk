import styled from "@emotion/styled";
import { SecuredByLeaf } from "@/icons/securedByLeaf";
import { theme } from "@/styles";

const SecuredByCrossmintContainer = styled.div`
    display: flex;
`;
const defaultColor = theme["cm-text-secondary"];

export function SecuredByCrossmint({ color = defaultColor, style }: { color?: string; style?: React.CSSProperties }) {
    return (
        <SecuredByCrossmintContainer style={style}>
            <SecuredByLeaf color={color} />
        </SecuredByCrossmintContainer>
    );
}
