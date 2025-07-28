import type { DetailedHTMLProps, HTMLAttributes } from "react";
import styled from "@emotion/styled";

const StyledScreenReaderSpan = styled.span`
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
`;

export function ScreenReaderText(props: DetailedHTMLProps<HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>) {
    return <StyledScreenReaderSpan {...props} />;
}
