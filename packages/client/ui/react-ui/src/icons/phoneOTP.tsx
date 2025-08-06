import styled from "@emotion/styled";
import { theme } from "@/styles";

interface PhoneOtpIconProps {
    customAccentColor?: string;
    customBackgroundColor?: string;
}

const Container = styled.div`
    position: relative;
`;

export function PhoneOtpIcon({ customAccentColor, customBackgroundColor }: PhoneOtpIconProps) {
    const accentColor = customAccentColor || theme["cm-accent"];
    const backgroundColor = customBackgroundColor || theme["cm-background-primary"];
    const lightAccent = `${accentColor}20`;

    return (
        <Container>
            <svg width="74" height="74" viewBox="0 0 74 74" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="37" cy="37" r="37" fill={lightAccent} />

                <rect x="28" y="18" width="18" height="32" rx="3" fill={accentColor} />
                <rect x="30" y="22" width="14" height="20" rx="1" fill={backgroundColor} />
                <circle cx="37" cy="46" r="1.5" fill={backgroundColor} />

                <circle cx="50" cy="28" r="8" fill={accentColor} />
                <path d="M46 26h8c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2h-8l-2 2v-10z" fill={backgroundColor} />
                <circle cx="48" cy="30" r="0.8" fill={accentColor} />
                <circle cx="50.5" cy="30" r="0.8" fill={accentColor} />
                <circle cx="53" cy="30" r="0.8" fill={accentColor} />
            </svg>
        </Container>
    );
}
