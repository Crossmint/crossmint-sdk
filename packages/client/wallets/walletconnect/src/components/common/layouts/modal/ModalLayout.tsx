import { ReactNode } from "react";

import ActionModal, { ActionModalProps } from "./ActionModal";
import DAppRequestHeader, { DAppRequestHeaderProps } from "./DAppRequestHeader";
import DualActionButtons, { DualActionButtonsProps } from "./DualActionButtons";

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
