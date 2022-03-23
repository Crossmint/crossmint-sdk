import { html, css, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import {
    mintingContractTypes,
    onboardingRequestStatusResponse,
    crossmintStatusService,
    crossmintModalService,
    crossmintPayButtonService,
} from "@crossmint/client-sdk-base";

const defaultMintConfig: any = {
    type: mintingContractTypes.CANDY_MACHINE,
};

@customElement("crossmint-pay-button")
export class CrossmintPayButton extends LitElement {
    @property({ type: String })
    className = "";

    @property({ type: String })
    theme = "dark";

    @property({ type: Boolean })
    disabled = false;

    @property({ type: Number })
    tabIndex = 0;

    @property({ type: String })
    collectionTitle = "";

    @property({ type: String })
    collectionDescription = "";

    @property({ type: String })
    collectionPhoto = "";

    @property({ type: String })
    mintTo = "";

    @property({ type: String })
    emailTo = "";

    @property({ type: String })
    listingId = "";

    @property({ type: String })
    clientId = "";

    @property({ type: String })
    auctionId = "";

    @property({ type: Boolean })
    development = false;

    @property({ type: Boolean })
    hideMintOnInactiveClient = false;

    @property({ type: Boolean })
    showOverlay = true;

    @property({ type: Object })
    mintConfig = defaultMintConfig;

    static styles = css`
        button {
            display: flex;
            flex-direction: row;
            align-items: center;
            padding: 0.875rem 0.875rem;
            font-weight: 900;
            transition: opacity ease-in-out 0.25s;
            border-radius: 0.5rem;
            font-family: Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell,
                Open Sans, Helvetica Neue, sans-serif;
            outline: none;
            border: none;
            box-shadow: 0px 8px 15px rgba(0, 0, 0, 0.1);
            justify-content: center;
            /* background: ({ buttonBgColor }: CustomStylingProps) => buttonBgColor, */
            background: #1e1e1e;
        }

        button:hover:enabled {
            opacity: 0.6;
            cursor: pointer;
        }

        img {
            width: 21px;
            height: 21px;
            margin-right: 0.875rem;
        }

        p {
            color: white;
            margin: 0;
        }
    `;

    connecting = false;
    setConnecting = (conn: boolean) => {
        this.connecting = conn;
    };
    status = onboardingRequestStatusResponse.WAITING_SUBMISSION;
    setStatus = (status: onboardingRequestStatusResponse) => {
        this.status = status;
    };

    statusService = crossmintStatusService({
        libVersion: "0.0.1",
        clientId: this.clientId,
        development: this.development,
        auctionId: this.auctionId,
        mintConfig: this.mintConfig,
        setStatus: this.setStatus,
    });

    modalService = crossmintModalService({
        development: this.development,
        clientId: this.clientId,
        showOverlay: this.showOverlay,
        setConnecting: this.setConnecting,
        libVersion: "0.0.1",
    });

    payButtonService = crossmintPayButtonService();

    checkedProps = this.payButtonService.checkProps({
        collectionTitle: this.collectionTitle,
        collectionPhoto: this.collectionPhoto,
        collectionDescription: this.collectionDescription,
    });

    /* this.collectionTitle = this.checkedProps[0];
    this.collectionDescription = this.checkedProps[1];
    this.collectionPhoto = this.checkedProps[2]; */

    connectedCallback() {
        super.connectedCallback();

        if (this.hideMintOnInactiveClient) {
            this.statusService.fetchClientIntegration();
        }
    }

    handleClick(event: any) {
        // Think how to replicate this?
        // if (onClick) onClick(event);

        if (this.connecting) return;

        if (!event.defaultPrevented) {
            this.modalService.connect(
                this.mintConfig,
                this.collectionTitle,
                this.collectionDescription,
                this.collectionPhoto,
                this.mintTo,
                this.emailTo,
                this.listingId
            );
        }
    }

    content = this.payButtonService.getButtonText(this.connecting);

    render() {
        if (
            this.payButtonService.shouldHideButton({
                hideMintOnInactiveClient: this.hideMintOnInactiveClient,
                status: this.status,
            })
        ) {
            return html``;
        }
        return html`
            <button
                className=""
                ${this.disabled && "disabled"}
                @click=${this.handleClick}
                tabindex=${this.tabIndex}
                {...props}
            >
                <img src="https://www.crossmint.io/assets/crossmint/logo.png" alt="Crossmint logo" />
                <p>${this.content}</p>
            </button>
        `;
    }
}
