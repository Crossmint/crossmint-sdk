import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import type { UIConfig } from "@crossmint/common-sdk-base";
import styled from "@emotion/styled";
import { theme } from "../../styles";

const DividerContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 8px 0px 12px;
`;

const DividerLine = styled.span`
    width: 100%;
    height: 1px;
    background-color: ${theme["cm-border"]};
`;

const DividerText = styled.p`
    color: ${theme["cm-text-primary"]};
    font-size: 14px;
    font-weight: 400;
    margin: 1px;
    padding: 0 8px;
`;

export function Divider({ appearance, text }: { appearance?: UIConfig; text?: string }) {
    const { step } = useAuthForm();

    if (step !== "initial") {
        return null;
    }

    return (
        <DividerContainer>
            <DividerLine style={{ backgroundColor: appearance?.colors?.border }} />
            {text != null ? (
                <DividerText style={{ color: appearance?.colors?.textSecondary }}>{text}</DividerText>
            ) : null}
            <DividerLine style={{ backgroundColor: appearance?.colors?.border }} />
        </DividerContainer>
    );
}
