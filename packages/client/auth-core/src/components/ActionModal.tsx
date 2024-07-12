import { Dialog, Transition } from "@headlessui/react";
import { Fragment, ReactNode } from "react";


export type ActionModalProps = {
    show: boolean;
    onClose?: () => void;
};

export default function ActionModal({
    show,
    onClose = () => { },
    children,
}: ActionModalProps & { children: ReactNode }) {

    return (
        <Transition.Root show={show} as={Fragment}>
            <Dialog
                as="div"
                className="fixed inset-0 z-20 flex items-center justify-center overflow-y-auto"
                onClose={onClose}
            >
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-400"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-400"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div
                        onClick={onClose}
                        className=" fixed inset-0 transition-opacity bg-[#8b9797] bg-opacity-20 backdrop-blur-sm"
                        style={{ zIndex: -10 }}
                    />
                </Transition.Child>

                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-400"
                    enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                    enterTo="opacity-100 translate-y-0 sm:scale-100"
                    leave="ease-in duration-400"
                    leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                    leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                >
                    <div
                        className="z-30 flex flex-col items-center rounded-xl p-5 md:p-7 shadow-sm m-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {children}
                    </div>
                </Transition.Child>
            </Dialog>
        </Transition.Root>
    );
}
