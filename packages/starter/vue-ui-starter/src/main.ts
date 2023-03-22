import { createApp } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";

import App from "./App.vue";
import Minting from "./components/Minting.vue";
import PayWithCC from "./components/PayWithCC.vue";

const About = { template: "<div>About</div>" };

const routes = [
    { path: "/", component: App },
    { path: "/checkout", component: PayWithCC },
    { path: "/minting", component: Minting },
];

export const router = createRouter({
    history: createWebHashHistory(),
    routes,
});

const app = createApp({});

app.use(router);

app.mount("#app");
