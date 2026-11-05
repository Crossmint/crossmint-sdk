import type { CrossmintPaymentMethodManagementProps } from "@/types/payment-method-management/CrossmintPaymentMethodManagementProps";
import {
    paymentMethodManagementIncomingEvents,
    paymentMethodManagementOutgoingEvents,
} from "@/types/payment-method-management/events";
import { appendObjectToQueryParams } from "@/utils/appendObjectToQueryParams";
import { IFrameWindow } from "@crossmint/client-sdk-window";
import type { CrossmintApiClient } from "@crossmint/common-sdk-base";

const KNOWN_DEFAULT_VALUES_KEYS = ["billingDetails"];
const KNOWN_BILLING_DETAILS_KEYS = ["address"];
const KNOWN_ADDRESS_KEYS = ["country", "line1", "line2", "city", "stateOrRegion", "postalCode"];

export type PaymentMethodManagementServiceProps = {
    apiClient: CrossmintApiClient;
};

export function createPaymentMethodManagementService({ apiClient }: PaymentMethodManagementServiceProps) {
    // React calls `getUrl` on every render: log each warning once per service.
    const loggedWarnings = new Set<string>();

    function warnOnce(message: string) {
        if (loggedWarnings.has(message)) {
            return;
        }
        loggedWarnings.add(message);
        console.warn(message);
    }

    function warnAboutUnknownKeys(value: Record<string, unknown>, path: string, knownKeys: string[]) {
        for (const key of Object.keys(value)) {
            if (!knownKeys.includes(key)) {
                warnOnce(
                    `[CrossmintPaymentMethodManagement] Unknown key "${path}.${key}" is ignored. Known keys: ${knownKeys.join(", ")}.`
                );
            }
        }
    }

    // Like Stripe.js: a wrong shape or type is a programming error and throws; an unknown key
    // only warns. The iframe validates the values themselves and ignores an invalid one, because
    // hosts fill them from their buyers' stored data and they must never break the form.
    function assertValidDefaultValues(defaultValues: unknown) {
        if (defaultValues === undefined) {
            return;
        }
        assertPlainObject(defaultValues, "defaultValues");
        warnAboutUnknownKeys(defaultValues, "defaultValues", KNOWN_DEFAULT_VALUES_KEYS);

        const { billingDetails } = defaultValues;
        if (billingDetails === undefined) {
            return;
        }
        assertPlainObject(billingDetails, "defaultValues.billingDetails");
        warnAboutUnknownKeys(billingDetails, "defaultValues.billingDetails", KNOWN_BILLING_DETAILS_KEYS);

        const { address } = billingDetails;
        if (address === undefined) {
            return;
        }
        assertPlainObject(address, "defaultValues.billingDetails.address");
        warnAboutUnknownKeys(address, "defaultValues.billingDetails.address", KNOWN_ADDRESS_KEYS);
        for (const key of KNOWN_ADDRESS_KEYS) {
            const field = address[key];
            // `null` is stored data for "no value" (an empty line 2 in a database), not a programming error.
            if (field != null && typeof field !== "string") {
                throw new Error(
                    `[CrossmintPaymentMethodManagement] defaultValues.billingDetails.address.${key} must be a string, got ${describeType(field)}.`
                );
            }
        }
    }

    function getIFrameUrl(props: CrossmintPaymentMethodManagementProps) {
        assertValidDefaultValues(props.defaultValues);

        const urlWithPath = apiClient.buildUrl("/sdk/unstable/payment-method-management");
        const queryParams = new URLSearchParams();

        // An empty array would serialize as `[]` (appendObjectToQueryParams only
        // skips falsy values, and `![]` is false), which the iframe would read as
        // "render nothing" instead of applying the documented default. Drop these
        // keys when empty so the iframe defaults apply (`allowedPaymentMethodTypes`
        // → `["card"]`, `allowedModes` → `["new"]`).
        const { allowedPaymentMethodTypes, allowedModes, ...rest } = props;
        const serializableProps = {
            ...rest,
            ...(allowedPaymentMethodTypes?.length ? { allowedPaymentMethodTypes } : {}),
            ...(allowedModes?.length ? { allowedModes } : {}),
        };

        appendObjectToQueryParams(queryParams, serializableProps);

        queryParams.append("apiKey", apiClient.crossmint.apiKey);
        queryParams.append("sdkMetadata", JSON.stringify(apiClient["internalConfig"].sdkMetadata));

        return `${urlWithPath}?${queryParams.toString()}`;
    }

    function createIframeClient(iframe: HTMLIFrameElement) {
        return IFrameWindow.initExistingIFrame(iframe, {
            incomingEvents: paymentMethodManagementIncomingEvents,
            outgoingEvents: paymentMethodManagementOutgoingEvents,
        });
    }

    return {
        iframe: {
            getUrl: getIFrameUrl,
            createClient: createIframeClient,
        },
    };
}

function assertPlainObject(value: unknown, path: string): asserts value is Record<string, unknown> {
    const prototype = value !== null && typeof value === "object" ? Object.getPrototypeOf(value) : undefined;
    if (prototype !== Object.prototype && prototype !== null) {
        throw new Error(
            `[CrossmintPaymentMethodManagement] ${path} must be a plain object, got ${describeType(value)}.`
        );
    }
}

function describeType(value: unknown) {
    if (value === null) {
        return "null";
    }
    if (Array.isArray(value)) {
        return "an array";
    }
    if (typeof value === "object") {
        return `an instance of ${value.constructor?.name ?? "an unknown class"}`;
    }
    return typeof value;
}
