import { reactive } from "vue";

import { crossmintPaymentService } from "@crossmint/client-sdk-base";

interface Order {
    orderIdentifier?: string;
}

export function useCrossmintOrder({ orderIdentifier }: { orderIdentifier: string }) {
    let order = reactive<Order>({});
    const { getOrder } = crossmintPaymentService();

    setInterval(async () => {
        order = await getOrder(orderIdentifier);
    }, 5000);

    return {
        order,
    };
}
