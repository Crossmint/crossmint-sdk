import type { ReactNode } from "react";

import ActionModal, { type ActionModalProps } from "./ActionModal";
import DAppRequestHeader, { type DAppRequestHeaderProps } from "./DAppRequestHeader";
import DualActionButtons, { type DualActionButtonsProps } from "./DualActionButtons";

export type ModalLayoutProps = {
    modal: ActionModalProps;
    dAppRequestHeader: DAppRequestHeaderProps;
    dualActionButtons: DualActionButtonsProps;
    children: ReactNode;
};

export default function ModalLayout({ modal, dAppRequestHeader, dualActionButtons, children }: ModalLayoutProps) {
    return (
        <ActionModal {...modal}>
            <DAppRequestHeader {...dAppRequestHeader} />
            {children}
            <DualActionButtons {...dualActionButtons} />
        </ActionModal>
    );
}
