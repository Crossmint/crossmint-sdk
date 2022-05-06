import { html, LitElement } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { property } from "lit/decorators/property.js";
import { customElement } from "lit/decorators/custom-element.js";
import {
    mintingContractTypes,
    onboardingRequestStatusResponse,
    crossmintStatusService,
    crossmintModalService,
    crossmintPayButtonService,
    PayButtonConfig,
    clientNames,
} from "@crossmint/client-sdk-base";
import { LIB_VERSION } from "./version";
import { CrossmintPayButtonLitProps } from "./types";
import { buttonStyles } from "./styles";

const propertyDefaults: CrossmintPayButtonLitProps = {
    className: "",
    theme: "dark",
    disabled: false,
    tabIndex: 0,
    collectionTitle: "",
    collectionDescription: "",
    collectionPhoto: "",
    mintTo: "",
    emailTo: "",
    listingId: "",
    clientId: "",
    auctionId: "",
    environment: "",
    hideMintOnInactiveClient: false,
    showOverlay: true,
    mintConfig: {
        type: mintingContractTypes.CANDY_MACHINE,
    },
    onClick: undefined,
    whPassThroughArgs: undefined,
    paymentMethod: undefined,
};

@customElement("crossmint-pay-button")
export class CrossmintPayButton extends LitElement {
    @property({ type: String })
    theme = propertyDefaults.theme;

    @property({ type: Boolean })
    disabled = propertyDefaults.disabled;

    @property({ type: String })
    collectionTitle = propertyDefaults.collectionTitle;

    @property({ type: String })
    collectionDescription = propertyDefaults.collectionDescription;

    @property({ type: String })
    collectionPhoto = propertyDefaults.collectionPhoto;

    @property({ type: String })
    mintTo = propertyDefaults.mintTo;

    @property({ type: String })
    emailTo = propertyDefaults.emailTo;

    @property({ type: String })
    listingId = propertyDefaults.listingId;

    @property({ type: String })
    clientId = propertyDefaults.clientId;

    @property({ type: String })
    auctionId = propertyDefaults.auctionId;

    @property({ type: String })
    environment = propertyDefaults.environment;

    @property({ type: Boolean })
    hideMintOnInactiveClient = propertyDefaults.hideMintOnInactiveClient;

    @property({ type: Boolean })
    showOverlay = propertyDefaults.showOverlay;

    @property({ type: Object })
    mintConfig: PayButtonConfig = {
        type: mintingContractTypes.CANDY_MACHINE,
    };

    @property({ type: Function })
    onClick = propertyDefaults.onClick;

    @property({ type: Object})
    whPassThroughArgs = propertyDefaults.whPassThroughArgs;

    @property({ type: String })
    paymentMethod = propertyDefaults.paymentMethod;

    static styles = buttonStyles;

    connecting = false;
    setConnecting = (conn: boolean) => {
        this.connecting = conn;
    };
    status = onboardingRequestStatusResponse.WAITING_SUBMISSION;
    setStatus = (status: onboardingRequestStatusResponse) => {
        this.status = status;
    };
    classes = { light: false };
    statusService: any = null;
    modalService: any = null;

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

        if (this.hideMintOnInactiveClient) {
            fetchClientIntegration();
        }

        const { checkProps } = crossmintPayButtonService({ onClick: this.onClick, connecting: this.connecting });

        const [newCollectionTitle, newCollectionDescription, newCollectionPhoto] = checkProps({
            collectionTitle: this.collectionTitle,
            collectionPhoto: this.collectionPhoto,
            collectionDescription: this.collectionDescription,
        });

        this.collectionTitle = newCollectionTitle;
        this.collectionDescription = newCollectionDescription;
        this.collectionPhoto = newCollectionPhoto;
    }

    render() {
        const { shouldHideButton, handleClick, getButtonText } = crossmintPayButtonService({
            onClick: this.onClick,
            connecting: this.connecting,
            paymentMethod: this.paymentMethod,
        });
        if (
            shouldHideButton({
                hideMintOnInactiveClient: this.hideMintOnInactiveClient,
                status: this.status,
            })
        ) {
            return html``;
        }
        const content = getButtonText(this.connecting);

        const { connect } = crossmintModalService({
            environment: this.environment,
            clientId: this.clientId,
            showOverlay: this.showOverlay || true,
            setConnecting: this.setConnecting,
            libVersion: LIB_VERSION,
            clientName: clientNames.vanillaUi,
        });

        const _handleClick = (e: any) =>
            handleClick(e, () => {
                connect(
                    this.mintConfig,
                    this.collectionTitle,
                    this.collectionDescription,
                    this.collectionPhoto,
                    this.mintTo,
                    this.emailTo,
                    this.listingId,
                    this.whPassThroughArgs,
                    this.paymentMethod,
                );
            });

        this.classes.light = this.theme === "light";
        console.log('this.disabled->', this.disabled);
        return html`
            <button
                class=${classMap(this.classes)}
                .disabled=${this.disabled}
                @click=${_handleClick}
                tabindex=${this.tabIndex}
            >
                <img src="https://www.crossmint.io/assets/crossmint/logo.png" alt="Crossmint logo" />
                <p>${content}</p>
            </button>
        `;
    }
}
