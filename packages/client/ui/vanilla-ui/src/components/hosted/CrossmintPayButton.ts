import { LitElement, html } from "lit";
import { customElement } from "lit/decorators/custom-element.js";
import { property } from "lit/decorators/property.js";
import { classMap } from "lit/directives/class-map.js";

import {
    type CrossmintPayButtonProps,
    clientNames,
    crossmintModalService,
    crossmintPayButtonService,
} from "@crossmint/client-sdk-base";

import { LIB_VERSION } from "../../consts/version";
import { hostedCheckoutButtonStyles } from "./styles";

export type CrossmintPayButtonLitProps = CrossmintPayButtonProps & {
    onClick?: (e: any) => void;
};

const propertyDefaults: CrossmintPayButtonLitProps = {
    className: "",
    theme: "dark",
    disabled: false,
    tabIndex: 0,
    mintTo: "",
    emailTo: "",
    listingId: "",
    clientId: "",
    collectionId: "",
    auctionId: "",
    environment: "",
    showOverlay: true,
    onClick: undefined,
    whPassThroughArgs: undefined,
    paymentMethod: undefined,
    preferredSigninMethod: undefined,
    dismissOverlayOnClick: false,
    prepay: false,
    locale: "en-US",
    currency: "usd",
    successCallbackURL: "",
    failureCallbackURL: "",
    loginEmail: "",
    getButtonText: undefined,
    checkoutProps: {
        experimental: false,
        display: "same-tab",
        paymentMethods: ["fiat", "ETH", "SOL"],
        delivery: "all",
    },
};

@customElement("crossmint-pay-button")
export class CrossmintPayButton extends LitElement {
    @property({ type: String })
    theme = propertyDefaults.theme;

    @property({ type: Boolean })
    disabled = propertyDefaults.disabled;

    @property({ type: String })
    mintTo = propertyDefaults.mintTo;

    @property({ type: String })
    emailTo = propertyDefaults.emailTo;

    @property({ type: String })
    listingId = propertyDefaults.listingId;

    @property({ type: String })
    clientId = "";

    @property({ type: String })
    collectionId = "";

    @property({ type: String })
    projectId = propertyDefaults.projectId;

    @property({ type: String })
    auctionId = propertyDefaults.auctionId;

    @property({ type: String })
    environment = propertyDefaults.environment;

    @property({ type: Boolean })
    showOverlay = propertyDefaults.showOverlay;

    @property({ type: Object })
    mintConfig = propertyDefaults.mintConfig;

    @property({ type: Function })
    onClick = propertyDefaults.onClick;

    @property({ type: Object })
    whPassThroughArgs = propertyDefaults.whPassThroughArgs;

    @property({ type: String })
    paymentMethod = propertyDefaults.paymentMethod;

    @property({ type: String })
    preferredSigninMethod = propertyDefaults.preferredSigninMethod;

    @property({ type: Boolean })
    dismissOverlayOnClick = propertyDefaults.dismissOverlayOnClick;

    @property({ type: Boolean })
    prepay = propertyDefaults.prepay;

    @property({ type: String })
    locale = propertyDefaults.locale;

    @property({ type: String })
    currency = propertyDefaults.currency;

    @property({ type: String })
    successCallbackURL = propertyDefaults.successCallbackURL;

    @property({ type: String })
    failureCallbackURL = propertyDefaults.failureCallbackURL;

    @property({ type: String })
    loginEmail = propertyDefaults.loginEmail;

    @property({ type: Function })
    getButtonText = propertyDefaults.getButtonText;

    @property({ type: Object })
    checkoutProps = propertyDefaults.checkoutProps;

    static styles = hostedCheckoutButtonStyles;

    connecting = false;
    setConnecting = (conn: boolean) => {
        this.connecting = conn;
    };
    classes = { light: false };
    modalService: any = null;

    connectedCallback() {
        super.connectedCallback();
    }

    render() {
        const { handleClick, getButtonText: getButtonTextInteral } = crossmintPayButtonService({
            onClick: this.onClick,
            connecting: this.connecting,
            paymentMethod: this.paymentMethod,
            locale: this.locale || "en-US",
            checkoutProps: this.checkoutProps,
        });

        const content =
            this.getButtonText != null
                ? this.getButtonText(this.connecting, this.paymentMethod || "fiat")
                : getButtonTextInteral(this.connecting);

        const { connect } = crossmintModalService({
            environment: this.environment,
            clientId: this.clientId || this.collectionId,
            projectId: this.projectId,
            showOverlay: this.showOverlay || true,
            dismissOverlayOnClick: this.dismissOverlayOnClick,
            setConnecting: this.setConnecting,
            libVersion: LIB_VERSION,
            clientName: clientNames.vanillaUi,
            locale: this.locale || "en-US",
            currency: this.currency || "usd",
            successCallbackURL: this.successCallbackURL,
            failureCallbackURL: this.failureCallbackURL,
            loginEmail: this.loginEmail,
        });

        const _handleClick = (e: any) =>
            handleClick(e, () => {
                connect(
                    this.mintConfig,
                    this.mintTo,
                    this.emailTo,
                    this.listingId,
                    this.whPassThroughArgs,
                    this.paymentMethod,
                    this.preferredSigninMethod,
                    this.prepay,
                    this.checkoutProps
                );
            });

        this.classes.light = this.theme === "light";

        return html`
            <button
                class=${classMap(this.classes)}
                .disabled=${this.disabled}
                @click=${_handleClick}
                tabindex=${this.tabIndex}
                part="button"
            >
                <img src="https://www.crossmint.io/assets/crossmint/logo.svg" alt="Crossmint logo" />
                <span part="contentParagraph">${content}</span>
            </button>
        `;
    }
}
