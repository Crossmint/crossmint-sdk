import type { PopupWindow } from "@crossmint/client-sdk-window";

const OVERLAY_ID = "crossmint-hosted-checkout-v3-overlay";

export function crossmintHostedCheckoutOverlayService() {
    function createOverlay(windowClient: ReturnType<typeof PopupWindow.initSync>) {
        const overlay = document.createElement("div");
        overlay.setAttribute("id", OVERLAY_ID);
        Object.assign(overlay.style, {
            width: "100vw",
            height: "100vh",
            "background-color": "rgba(0, 0, 0, 0.5)",
            inset: 0,
            position: "fixed",
            "z-index": "99999999",
            opacity: "0",
            transition: "opacity 0.25s ease-in-out",
            display: "flex",
            "flex-direction": "column",
            "justify-content": "center",
            "align-items": "center",
            padding: "20px",
        });
        overlay.innerHTML = INNER_HTML;
        document.body.appendChild(overlay);

        setTimeout(() => {
            overlay.style.opacity = "1";
        }, 1);

        const interval = setInterval(() => {
            if (windowClient.window.closed) {
                clearInterval(interval);
                removeOverlay();
            }
        }, 250);

        overlay.addEventListener("click", () => {
            clearInterval(interval);
            removeOverlay();
        });
    }

    function removeOverlay() {
        const overlay = document.getElementById(OVERLAY_ID);
        if (overlay) {
            overlay.style.opacity = "0";
            setTimeout(() => {
                overlay.remove();
            }, 250);
        }
    }

    return {
        create: createOverlay,
        remove: removeOverlay,
    };
}

const INNER_HTML = `
    <img src="https://www.crossmint.com/assets/crossmint/logo/v2?colors=%7B%22icon%22:%7B%22type%22:%22solid%22,%22color%22:%22white%22%7D,%22text%22:%22white%22%7D" style="width: 100%; max-width: 200px;" />
    <p style="color: white; font-size: 16px; text-align: center; max-width: 400px;">Continue your purchase in the secure Crossmint window</p>
    `;
