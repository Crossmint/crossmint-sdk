import * as EmailValidator from "email-validator";
import { useEffect } from "react";

import InputV2 from "../components/Common/InputV2";
import { Caption } from "../components/Common/Text";
import useDebounce from "../hooks/useDebounce";

interface EmailInputProps {
    email: string;
    setEmail: (email: string) => void;
    errorMessage: string | undefined;
    setErrorMessage: (errorMessage: string | undefined) => void;
    caption?: string;
}

export const EmailInput = ({ email, setEmail, errorMessage, setErrorMessage, caption }: EmailInputProps) => {
    const [emailDebounce, setEmailDebounce] = useDebounce<string | undefined>(email, 50);

    useEffect(() => {
        setEmailDebounce(email);
    }, [email]);

    useEffect(() => {
        setErrorMessage(undefined);
        if (emailDebounce && !EmailValidator.validate(emailDebounce)) {
            setErrorMessage("Invalid email address");
            return;
        }
    }, [emailDebounce]);

    return (
        <>
            <InputV2
                value={email}
                required
                placeholder="email@email.com"
                role="mint-email"
                className="w-full"
                type="text"
                errorMessage={errorMessage}
                onChange={(e) => setEmail(e.target.value)}
                disabled={true}
            />
            {caption && <Caption className="mt-[0.5rem] text-[#59797F]">{caption}</Caption>}
        </>
    );
};
