import { html, css, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import {
    mintingContractTypes,
    onboardingRequestStatusResponse,
    crossmintStatusService,
    crossmintModalService,
    crossmintPayButtonService,
} from "@crossmint/client-sdk-base";
import { LIB_VERSION } from "./version";

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

    @property({ type: String })
    environment = "";

    @property({ type: Boolean })
    hideMintOnInactiveClient = false;

    @property({ type: Boolean })
    showOverlay = true;

    @property({ type: Object })
    mintConfig = defaultMintConfig;

    @property({ type: Function })
    onClick?: (e: any) => void;

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
            background: #1e1e1e;
            color: white;
        }
        button.light {
            background: white;
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

        button.light p {
            color: black;
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
    classes = { light: false };
    statusService: any = null;
    modalService: any = null;
    payButtonService: any = null;

    connectedCallback() {
        super.connectedCallback();

        this.statusService = crossmintStatusService({
            libVersion: LIB_VERSION,
            clientId: this.clientId,
            environment: this.environment,
            auctionId: this.auctionId,
            mintConfig: this.mintConfig,
            setStatus: this.setStatus,
        });

        this.modalService = crossmintModalService({
            environment: this.environment,
            clientId: this.clientId,
            showOverlay: this.showOverlay,
            setConnecting: this.setConnecting,
            libVersion: LIB_VERSION,
        });

        this.payButtonService = crossmintPayButtonService({ onClick: this.onClick, connecting: this.connecting });

        if (this.hideMintOnInactiveClient) {
            this.statusService.fetchClientIntegration();
        }

        const checkedProps = this.payButtonService.checkProps({
            collectionTitle: this.collectionTitle,
            collectionPhoto: this.collectionPhoto,
            collectionDescription: this.collectionDescription,
        });

        this.collectionTitle = checkedProps[0];
        this.collectionDescription = checkedProps[1];
        this.collectionPhoto = checkedProps[2];

        this.classes.light = this.theme === "light";
    }

    handleClick = (e: any) =>
        this.payButtonService.handleClick(e, () => {
            this.modalService.connect(
                this.mintConfig,
                this.collectionTitle,
                this.collectionDescription,
                this.collectionPhoto,
                this.mintTo,
                this.emailTo,
                this.listingId
            );
        });

    render() {
        if (
            this.payButtonService.shouldHideButton({
                hideMintOnInactiveClient: this.hideMintOnInactiveClient,
                status: this.status,
            })
        ) {
            return html``;
        }
        const content = this.payButtonService.getButtonText(this.connecting);

        return html`
            <button
                class=${classMap(this.classes)}
                ${this.disabled && "disabled"}
                @click=${this.handleClick}
                tabindex=${this.tabIndex}
                {...props}
            >
                <img src="https://www.crossmint.io/assets/crossmint/logo.png" alt="Crossmint logo" />
                <p>${content}</p>
            </button>
        `;
    }
}
