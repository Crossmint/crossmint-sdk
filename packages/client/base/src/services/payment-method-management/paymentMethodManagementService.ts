import type {
    CrossmintPaymentMethodManagementProps,
    PaymentMethodManagementDefaultValues,
} from "@/types/payment-method-management/CrossmintPaymentMethodManagementProps";
import {
    paymentMethodManagementIncomingEvents,
    paymentMethodManagementOutgoingEvents,
} from "@/types/payment-method-management/events";
import { appendObjectToQueryParams } from "@/utils/appendObjectToQueryParams";
import { IFrameWindow } from "@crossmint/client-sdk-window";
import type { CrossmintApiClient } from "@crossmint/common-sdk-base";

type DefaultBillingDetails = NonNullable<PaymentMethodManagementDefaultValues["billingDetails"]>;
type DefaultAddress = NonNullable<DefaultBillingDetails["address"]>;

// Records, not arrays, so a field added to the type without an entry here fails to compile.
const KNOWN_DEFAULT_VALUES_KEYS = keysOf({ billingDetails: true } satisfies Record<
    keyof PaymentMethodManagementDefaultValues,
    true
>);
const KNOWN_BILLING_DETAILS_KEYS = keysOf({ address: true } satisfies Record<keyof DefaultBillingDetails, true>);
const KNOWN_ADDRESS_KEYS = keysOf({
    country: true,
    line1: true,
    line2: true,
    city: true,
    stateOrRegion: true,
    postalCode: true,
} satisfies Record<keyof DefaultAddress, true>);

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

    function warnAboutUnknownKeys(value: Record<string, unknown>, path: string, knownKeys: readonly string[]) {
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
    // `null` at any level is stored data for "no value" (a buyer without an address), not an error.
    // Returns a copy with only the known keys, so unknown keys (a spread buyer record with email or
    // internal IDs) never reach the iframe URL.
    function parseDefaultValues(defaultValues: unknown): PaymentMethodManagementDefaultValues | undefined {
        if (defaultValues == null) {
            return undefined;
        }
        assertObject(defaultValues, "defaultValues");
        warnAboutUnknownKeys(defaultValues, "defaultValues", KNOWN_DEFAULT_VALUES_KEYS);

        const { billingDetails } = defaultValues;
        if (billingDetails == null) {
            return {};
        }
        assertObject(billingDetails, "defaultValues.billingDetails");
        warnAboutUnknownKeys(billingDetails, "defaultValues.billingDetails", KNOWN_BILLING_DETAILS_KEYS);

        const { address } = billingDetails;
        if (address == null) {
            return { billingDetails: {} };
        }
        assertObject(address, "defaultValues.billingDetails.address");
        warnAboutUnknownKeys(address, "defaultValues.billingDetails.address", KNOWN_ADDRESS_KEYS);
        const knownAddress: DefaultAddress = {};
        for (const key of KNOWN_ADDRESS_KEYS) {
            // Read by name, not by `Object.keys`, so getters of class instances count too.
            const field = address[key];
            if (field === undefined) {
                continue;
            }
            if (field !== null && typeof field !== "string") {
                throw new Error(
                    `[CrossmintPaymentMethodManagement] defaultValues.billingDetails.address.${key} must be a string, got ${describeType(field)}.`
                );
            }
            knownAddress[key] = field;
        }
        return { billingDetails: { address: knownAddress } };
    }

    function getIFrameUrl(props: CrossmintPaymentMethodManagementProps) {
        const defaultValues = parseDefaultValues(props.defaultValues);

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
            defaultValues,
            ...(allowedPaymentMethodTypes?.length ? { allowedPaymentMethodTypes } : {}),
            ...(allowedModes?.length ? { allowedModes } : {}),
        };

        appendObjectToQueryParams(queryParams, serializableProps);

        // The component never renders a submit button; the host submits via ref.submit().
        queryParams.append("hideSubmitButton", "true");
        // The host gets the message of an invalid or failed submit from ref.submit() and shows it, so the iframe
        // draws only field errors and does not show the message a second time.
        queryParams.append("hostShowsSubmitErrors", "true");
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

// Any non-array object passes: class instances (ORM entities, DTOs) and objects from another
// realm serialize like plain objects.
function assertObject(value: unknown, path: string): asserts value is Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error(`[CrossmintPaymentMethodManagement] ${path} must be an object, got ${describeType(value)}.`);
    }
}

function keysOf<T extends object>(record: T) {
    return Object.keys(record) as (keyof T & string)[];
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
