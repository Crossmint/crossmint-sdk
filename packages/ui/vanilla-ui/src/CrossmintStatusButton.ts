import { html, LitElement } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { property } from "lit/decorators/property.js";
import { customElement } from "lit/decorators/custom-element.js";
import {
    crossmintStatusService,
    onboardingRequestStatusResponse,
    clientNames,
    crossmintStatusButtonService,
} from "@crossmint/client-sdk-base";
import { LIB_VERSION } from "./version";
import { CrossmintStatusButtonLitProps } from "./types";
import { buttonStyles } from "./styles";

const propertyDefaults: CrossmintStatusButtonLitProps = {
    className: "",
    theme: "dark",
    disabled: false,
    tabIndex: 0,
    clientId: "",
    auctionId: "",
    environment: "",
    platformId: "",
    mintConfig: {},
    onClick: undefined,
};

@customElement("crossmint-status-button")
export class CrossmintStatusButton extends LitElement {
    @property({ type: String })
    theme = propertyDefaults.theme;

    @property({ type: Boolean })
    disabled = propertyDefaults.disabled;

    @property({ type: String })
    clientId = propertyDefaults.clientId;

    @property({ type: String })
    auctionId = propertyDefaults.auctionId;

    @property({ type: String })
    environment = propertyDefaults.environment;

    @property({ type: Object })
    mintConfig = {};

    @property({ type: Function })
    onClick = propertyDefaults.onClick;

    static styles = buttonStyles;

    status = onboardingRequestStatusResponse.WAITING_SUBMISSION;
    setStatus = (status: onboardingRequestStatusResponse) => {
        this.status = status;
    };

    classes = { light: false };
    interval:any = null;

    connectedCallback() {
        super.connectedCallback();

        const { fetchClientIntegration } = crossmintStatusService({
            libVersion: LIB_VERSION,
            clientId: this.clientId,
            environment: this.environment,
            auctionId: this.auctionId,
            mintConfig: this.mintConfig,
            setStatus: this.setStatus,
            clientName: clientNames.vanillaUi,
        });

        fetchClientIntegration();

        this.interval = setInterval(() => {
            fetchClientIntegration();
        }, 60 * 1000);
    }

    disconnectedCallback() {
        clearInterval(this.interval);
    }

    render() {
        const { getButtonText, isButtonDisabled, handleClick } = crossmintStatusButtonService({ onClick: this.onClick});
        const { goToOnboarding } = crossmintStatusService({
            libVersion: LIB_VERSION,
            clientId: this.clientId,
            environment: this.environment,
            auctionId: this.auctionId,
            mintConfig: this.mintConfig,
            setStatus: this.setStatus,
            clientName: clientNames.vanillaUi,
        });

        const content = getButtonText(this.status);
        const isDisabled = isButtonDisabled(this.status) || this.disabled;

        const _handleClick = (e:any) => handleClick(e, this.status, goToOnboarding);

        this.classes.light = this.theme === "light";

        return html`
            <button
                class=${classMap(this.classes)}
                .disabled=${isDisabled}
                @click=${_handleClick}
                tabindex=${this.tabIndex}
            >
                <img src="https://www.crossmint.io/assets/crossmint/logo.png" alt="Crossmint logo" />
                <span>${content}</span>
            </button>
        `;
    }
}
