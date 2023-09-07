import { createRouter, createWebHashHistory } from "vue-router";
import { createApp } from "vue/dist/vue.esm-bundler";

import App from "./App.vue";
import Minting from "./components/Minting.vue";
import PayWithCC from "./components/PayWithCC.vue";

const routes = [
    { path: "/", component: App },
    { path: "/checkout", component: PayWithCC },
    { path: "/minting", component: Minting },
];

const router = createRouter({
    history: createWebHashHistory(),
    routes,
});

const app = createApp({});

app.use(router);

app.mount("#app");
