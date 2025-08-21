import styled from "@emotion/styled";
import { DynamicEmbeddedWidget } from "@dynamic-labs/sdk-react-core";
import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import { AuthFormBackButton } from "../../AuthFormBackButton";

const Container = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
`;

const ContentContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
`;

const WidgetContainer = styled.div`
    /* Widget container styles */
    min-height: 325px;
`;

export function Web3Connectors() {
    const { appearance, step, setStep } = useAuthForm();

    if (step === "web3") {
        return (
            <>
                <AuthFormBackButton
                    onClick={() => setStep("initial")}
                    iconColor={appearance?.colors?.textPrimary}
                    ringColor={appearance?.colors?.accent}
                />
                <Container>
                    <ContentContainer>
                        <WidgetContainer>
                            <DynamicEmbeddedWidget background="none" />
                        </WidgetContainer>
                    </ContentContainer>
                </Container>
            </>
        );
    }

    return null;
}
